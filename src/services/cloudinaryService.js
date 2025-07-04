const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

class CloudinaryService {
  constructor() {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    this.defaultOptions = {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ],
      folder: "english-center", // Default folder in Cloudinary
    };
  }

  /**
   * Validate image file
   * @param {Object} file - Multer file object
   * @param {Object} options - Validation options
   */
  validateImageFile(file, options = {}) {
    const { maxSize = this.defaultOptions.maxSize } = options;

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
      throw new Error("Chỉ chấp nhận file ảnh");
    }

    // Check specific image types
    if (!this.defaultOptions.allowedTypes.includes(file.mimetype)) {
      throw new Error(
        "Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận: JPG, PNG, GIF, WebP"
      );
    }
  }

  /**
   * Upload single image to Cloudinary (from multer file buffer)
   * @param {Object} file - Multer file object
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with secure_url, public_id, format
   */
  async uploadImage(file, options = {}) {
    this.validateImageFile(file, options);
    const { folder = this.defaultOptions.folder, resource_type = "image" } =
      options;
    // Convert buffer to base64 string
    const base64 = `data:${file.mimetype};base64,${file.buffer.toString(
      "base64"
    )}`;
    // Use uploadImageFromBase64 for consistency
    return this.uploadImageFromBase64(base64, { folder, resource_type });
  }

  /**
   * Upload image to Cloudinary from base64 string
   * @param {String} base64 - Base64 data URL
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with secure_url, public_id, format
   */
  async uploadImageFromBase64(base64, options = {}) {
    const { folder = this.defaultOptions.folder, resource_type = "image" } =
      options;
    try {
      const result = await cloudinary.uploader.upload(base64, {
        folder,
        resource_type,
        quality: "auto",
        fetch_format: "auto",
      });
      return result;
    } catch (error) {
      console.error("❌ Cloudinary base64 upload error:", error);
      throw new Error(`Lỗi upload ảnh base64 lên Cloudinary: ${error.message}`);
    }
  }

  /**
   * Upload multiple images to Cloudinary (from multer file array)
   * @param {Array} files - Array of multer file objects
   * @param {Object} options - Upload options
   * @returns {Promise<Array>} Array of upload results
   */
  async uploadMultipleImages(files, options = {}) {
    if (!files || files.length === 0) {
      return [];
    }
    const uploadPromises = files.map((file) => this.uploadImage(file, options));
    const results = await Promise.all(uploadPromises);
    return results;
  }

  /**
   * Delete image from Cloudinary
   * @param {String} publicId - Public ID of the image to delete
   * @param {Object} options - Delete options
   * @returns {Promise<Object>} Delete result
   */
  async deleteImage(publicId, options = {}) {
    try {
      const { resource_type = "image" } = options;

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type,
      });

      console.log(`✅ Image deleted from Cloudinary: ${publicId}`);
      return result;
    } catch (error) {
      console.error("❌ Cloudinary delete error:", error);
      throw new Error(`Lỗi xóa ảnh từ Cloudinary: ${error.message}`);
    }
  }

  /**
   * Delete multiple images from Cloudinary
   * @param {Array} publicIds - Array of public IDs to delete
   * @param {Object} options - Delete options
   * @returns {Promise<Object>} Delete result
   */
  async deleteMultipleImages(publicIds, options = {}) {
    try {
      const { resource_type = "image" } = options;

      const result = await cloudinary.api.delete_resources(publicIds, {
        resource_type,
      });

      console.log(
        `✅ Multiple images deleted from Cloudinary: ${publicIds.length} images`
      );
      return result;
    } catch (error) {
      console.error("❌ Cloudinary multiple delete error:", error);
      throw new Error(`Lỗi xóa nhiều ảnh từ Cloudinary: ${error.message}`);
    }
  }

  /**
   * Get optimized image URL with transformations
   * @param {String} publicId - Public ID of the image
   * @param {Object} transformations - Cloudinary transformations
   * @returns {String} Optimized image URL
   */
  getOptimizedUrl(publicId, transformations = {}) {
    const defaultTransformations = {
      quality: "auto",
      fetch_format: "auto",
    };

    return cloudinary.url(publicId, {
      ...defaultTransformations,
      ...transformations,
    });
  }

  /**
   * Generate thumbnail URL
   * @param {String} publicId - Public ID of the image
   * @param {Object} options - Thumbnail options
   * @returns {String} Thumbnail URL
   */
  getThumbnailUrl(publicId, options = {}) {
    const { width = 200, height = 200, crop = "fill" } = options;

    return this.getOptimizedUrl(publicId, {
      width,
      height,
      crop,
      quality: "auto",
      fetch_format: "auto",
    });
  }

  /**
   * Get original quality URL (no compression or resizing)
   * @param {String} publicId - Public ID of the image
   * @returns {String} Original quality URL
   */
  getOriginalUrl(publicId) {
    return cloudinary.url(publicId, {
      secure: true,
      quality: "100", // Maximum quality
      fetch_format: "auto", // Let Cloudinary choose best format
    });
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param {String} url - Cloudinary URL
   * @returns {String} Public ID
   */
  extractPublicId(url) {
    if (!url || !url.includes("cloudinary.com")) {
      return null;
    }

    try {
      // Extract public ID from URL
      const matches = url.match(/\/v\d+\/(.+)\.[a-zA-Z]+$/);
      return matches ? matches[1] : null;
    } catch (error) {
      console.error("Error extracting public ID:", error);
      return null;
    }
  }

  /**
   * Get image details from Cloudinary
   * @param {String} publicId - Public ID of the image
   * @returns {Promise<Object>} Image details
   */
  async getImageDetails(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        public_id: result.public_id,
        version: result.version,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        url: result.secure_url,
        created_at: result.created_at,
      };
    } catch (error) {
      console.error("❌ Error getting image details:", error);
      throw new Error(`Lỗi lấy thông tin ảnh: ${error.message}`);
    }
  }
}

module.exports = new CloudinaryService();
