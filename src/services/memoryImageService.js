/**
 * Image Conversion Service for Memory-based File Handling
 * Converts multer memory buffers directly to base64 without file system
 */

class MemoryImageService {
  /**
   * Validate image file from memory buffer
   * @param {Object} file - Multer file object with buffer
   * @param {Object} options - Validation options
   * @throws {Error} If validation fails
   */
  validateImageFile(file, options = {}) {
    const { maxSize = 5 * 1024 * 1024 } = options; // 5MB default

    if (!file) {
      throw new Error("No file provided");
    }

    if (!file.buffer) {
      throw new Error("File buffer not found");
    }

    // Check file size
    if (file.size > maxSize) {
      throw new Error(
        `File quá lớn. Kích thước tối đa là ${maxSize / (1024 * 1024)}MB`
      );
    }

    // Check MIME type
    if (!file.mimetype.startsWith("image/")) {
      throw new Error("Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif)");
    }

    // Check specific image types
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(
        "Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận: JPG, PNG, GIF, WebP"
      );
    }
  }

  /**
   * Convert memory buffer to base64 data URL
   * @param {Object} file - Multer file object with buffer
   * @param {Object} options - Processing options
   * @returns {String} Base64 data URL
   * @throws {Error} If processing fails
   */
  convertBufferToBase64DataUrl(file, options = {}) {
    if (!file) {
      return null;
    }

    try {
      // Validate file first
      this.validateImageFile(file, options);

      // Convert buffer to base64
      const imageBase64 = file.buffer.toString("base64");
      const imageMimeType = file.mimetype;

      // Create data URL
      const dataUrl = `data:${imageMimeType};base64,${imageBase64}`;

      return dataUrl;
    } catch (error) {
      throw new Error(`Error converting image to base64: ${error.message}`);
    }
  }

  /**
   * Convert memory buffer to base64 components
   * @param {Object} file - Multer file object with buffer
   * @param {Object} options - Processing options
   * @returns {Object} { base64: string, mimeType: string, size: number }
   * @throws {Error} If processing fails
   */
  convertBufferToBase64Components(file, options = {}) {
    if (!file) {
      return {
        base64: "",
        mimeType: "",
        size: 0,
      };
    }

    try {
      // Validate file first
      this.validateImageFile(file, options);

      // Convert buffer to base64
      const imageBase64 = file.buffer.toString("base64");
      const imageMimeType = file.mimetype;
      const imageSize = file.size;

      return {
        base64: imageBase64,
        mimeType: imageMimeType,
        size: imageSize,
      };
    } catch (error) {
      throw new Error(
        `Error converting image to base64 components: ${error.message}`
      );
    }
  }

  /**
   * Process multiple files to base64 data URLs
   * @param {Array} files - Array of multer file objects
   * @param {Object} options - Processing options
   * @returns {Array} Array of base64 data URLs
   */
  convertMultipleFilesToBase64(files, options = {}) {
    if (!files || files.length === 0) {
      return [];
    }

    const results = [];
    const errors = [];

    files.forEach((file, index) => {
      try {
        const dataUrl = this.convertBufferToBase64DataUrl(file, options);
        if (dataUrl) {
          results.push(dataUrl);
        }
      } catch (error) {
        errors.push(`File ${index + 1}: ${error.message}`);
      }
    });

    // Log errors but don't throw - allow partial success
    if (errors.length > 0) {
      console.warn("Some files failed to convert:", errors);
    }

    return results;
  }

  /**
   * Get image info from base64 data URL
   * @param {String} dataUrl - Base64 data URL
   * @returns {Object} { mimeType: string, size: number, extension: string }
   */
  getImageInfoFromDataUrl(dataUrl) {
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      return null;
    }

    try {
      const [header, base64Data] = dataUrl.split(",");
      const mimeType = header.match(/data:([^;]+)/)[1];
      const extension = mimeType.split("/")[1];
      const sizeInBytes = Math.ceil(base64Data.length * 0.75); // Approximate size

      return {
        mimeType,
        extension,
        size: sizeInBytes,
      };
    } catch (error) {
      console.error("Error parsing data URL:", error);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new MemoryImageService();
