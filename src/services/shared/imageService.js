const fs = require("fs");
const path = require("path");

/**
 * Shared Image Service for handling image uploads and Base64 conversion
 * Used by both Announcement and ParentPaymentRequest systems
 */
class ImageService {
  constructor() {
    this.defaultOptions = {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/gif"],
      tempDir: path.join(__dirname, "../../uploads/temp"),
    };
  }

  /**
   * Validate uploaded image file
   * @param {Object} file - Multer file object
   * @param {Object} options - Validation options
   * @returns {Boolean} True if valid
   * @throws {Error} If validation fails
   */
  validateImageFile(file, options = {}) {
    if (!file) {
      return true; // No file is valid (optional image)
    }

    const { maxSize, allowedTypes } = { ...this.defaultOptions, ...options };

    // Check file size
    if (file.size > maxSize) {
      throw new Error(
        `File quá lớn. Kích thước tối đa là ${maxSize / (1024 * 1024)}MB`
      );
    }

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(
        `Loại file không được hỗ trợ. Chỉ chấp nhận: ${allowedTypes.join(", ")}`
      );
    }

    return true;
  }

  /**
   * Convert uploaded file to Base64 data URL
   * @param {Object} uploadedFile - Multer file object
   * @param {Object} options - Processing options
   * @returns {String} Base64 data URL
   * @throws {Error} If processing fails
   */
  convertToBase64DataUrl(uploadedFile, options = {}) {
    if (!uploadedFile) {
      return null;
    }

    try {
      // Validate file first
      this.validateImageFile(uploadedFile, options);

      // Read file and convert to Base64
      const fileBuffer = fs.readFileSync(uploadedFile.path);
      const imageBase64 = fileBuffer.toString("base64");
      const imageMimeType = uploadedFile.mimetype;

      // Create data URL
      const dataUrl = `data:${imageMimeType};base64,${imageBase64}`;

      // Cleanup temp file
      this.cleanupTempFile(uploadedFile.path);

      return dataUrl;
    } catch (error) {
      // Ensure temp file cleanup even on error
      this.cleanupTempFile(uploadedFile.path);
      throw error;
    }
  }

  /**
   * Convert uploaded file to separate Base64 components (for ParentPaymentRequest format)
   * @param {Object} uploadedFile - Multer file object
   * @param {Object} options - Processing options
   * @returns {Object} { base64: string, mimeType: string, size: number }
   * @throws {Error} If processing fails
   */
  convertToBase64Components(uploadedFile, options = {}) {
    if (!uploadedFile) {
      return {
        base64: "",
        mimeType: "",
        size: 0,
      };
    }

    try {
      // Validate file first
      this.validateImageFile(uploadedFile, options);

      // Read file and convert to Base64
      const fileBuffer = fs.readFileSync(uploadedFile.path);
      const imageBase64 = fileBuffer.toString("base64");
      const imageMimeType = uploadedFile.mimetype;
      const imageSize = uploadedFile.size;

      // Cleanup temp file
      this.cleanupTempFile(uploadedFile.path);

      return {
        base64: imageBase64,
        mimeType: imageMimeType,
        size: imageSize,
      };
    } catch (error) {
      // Ensure temp file cleanup even on error
      this.cleanupTempFile(uploadedFile.path);
      throw error;
    }
  }

  /**
   * Process image for data object (Announcement format)
   * @param {Object} data - Data object to modify
   * @param {Object} uploadedFile - Multer file object
   * @param {String} imageField - Field name for image in data object
   * @param {Object} options - Processing options
   * @returns {Object} Modified data object
   */
  processImageForData(data, uploadedFile, imageField = "image", options = {}) {
    if (uploadedFile) {
      const imageDataUrl = this.convertToBase64DataUrl(uploadedFile, options);
      if (imageDataUrl) {
        data[imageField] = imageDataUrl;
      }
    }
    return data;
  }

  /**
   * Process image for separate fields (ParentPaymentRequest format)
   * @param {Object} data - Data object to modify
   * @param {Object} uploadedFile - Multer file object
   * @param {Object} fieldNames - Field names for components
   * @param {Object} options - Processing options
   * @returns {Object} Modified data object
   */
  processImageForSeparateFields(
    data,
    uploadedFile,
    fieldNames = {},
    options = {}
  ) {
    const {
      base64Field = "proofImageBase64",
      mimeTypeField = "proofImageMimeType",
      sizeField = "proofImageSize",
    } = fieldNames;

    if (uploadedFile) {
      const components = this.convertToBase64Components(uploadedFile, options);
      data[base64Field] = components.base64;
      data[mimeTypeField] = components.mimeType;
      data[sizeField] = components.size;
    }

    return data;
  }

  /**
   * Clean up temporary file
   * @param {String} filePath - Path to temporary file
   */
  cleanupTempFile(filePath) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error("Lỗi khi xóa file tạm:", unlinkError.message);
      }
    }
  }

  /**
   * Extract image info from data URL
   * @param {String} dataUrl - Base64 data URL
   * @returns {Object|null} Image info
   */
  extractImageInfo(dataUrl) {
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      return null;
    }

    try {
      const [header, base64Data] = dataUrl.split(",");
      const mimeType = header.match(/data:([^;]+)/)[1];
      const size = Buffer.from(base64Data, "base64").length;

      return {
        mimeType,
        size,
        base64Data,
        dataUrl,
      };
    } catch (error) {
      console.error("Lỗi khi phân tích thông tin hình ảnh:", error);
      return null;
    }
  }

  /**
   * Convert separate Base64 components to data URL
   * @param {String} base64 - Base64 string
   * @param {String} mimeType - MIME type
   * @returns {String|null} Data URL
   */
  convertComponentsToDataUrl(base64, mimeType) {
    if (!base64 || !mimeType) {
      return null;
    }

    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Cleanup old temporary files
   * @param {Number} maxAge - Maximum age in milliseconds (default: 1 hour)
   */
  cleanupOldTempFiles(maxAge = 60 * 60 * 1000) {
    try {
      const tempDir = this.defaultOptions.tempDir;

      if (!fs.existsSync(tempDir)) {
        return;
      }

      const files = fs.readdirSync(tempDir);
      const now = Date.now();

      files.forEach((file) => {
        const filePath = path.join(tempDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
            console.log(`Đã xóa file tạm cũ: ${file}`);
          }
        } catch (fileError) {
          console.error(`Lỗi khi xử lý file ${file}:`, fileError.message);
        }
      });
    } catch (error) {
      console.error("Lỗi khi dọn dẹp file tạm:", error.message);
    }
  }

  /**
   * Create image data URL from buffer
   * @param {Buffer} buffer - Image buffer
   * @param {String} mimeType - MIME type
   * @returns {String} Data URL
   */
  createDataUrlFromBuffer(buffer, mimeType) {
    const base64 = buffer.toString("base64");
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Validate data URL format
   * @param {String} dataUrl - Data URL to validate
   * @returns {Boolean} Is valid
   */
  isValidDataUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") {
      return false;
    }

    return dataUrl.startsWith("data:image/") && dataUrl.includes("base64,");
  }
}

// Export singleton instance
const imageService = new ImageService();

module.exports = imageService;
