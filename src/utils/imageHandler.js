const fs = require("fs").promises;
const path = require("path");
const sharp = require("sharp"); // You may need to install this: npm install sharp

const imageHandler = {
  // Supported image formats
  supportedFormats: [".jpg", ".jpeg", ".png", ".gif", ".webp"],

  // Maximum file size (5MB)
  maxFileSize: 5 * 1024 * 1024,

  // Validate image file
  validateImage(file) {
    if (!file) {
      throw new Error("No file provided");
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error(
        `File size too large. Maximum allowed: ${
          this.maxFileSize / (1024 * 1024)
        }MB`
      );
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.supportedFormats.includes(ext)) {
      throw new Error(
        `Unsupported file format. Supported formats: ${this.supportedFormats.join(
          ", "
        )}`
      );
    }

    // Check MIME type
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error("Invalid file type");
    }

    return true;
  },

  // Process and save image
  async processAndSave(file, destination, options = {}) {
    try {
      this.validateImage(file);

      const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 80,
        format = "jpeg",
        preserveOriginal = false,
      } = options;

      // Ensure destination directory exists
      const destDir = path.dirname(destination);
      await fs.mkdir(destDir, { recursive: true });

      // If preserveOriginal is true, save original file as well
      if (preserveOriginal) {
        const originalPath = destination.replace(
          path.extname(destination),
          `_original${path.extname(file.originalname)}`
        );
        await fs.copyFile(file.path, originalPath);
      }

      // Process image with sharp (if installed)
      if (typeof sharp !== "undefined") {
        await sharp(file.path)
          .resize(maxWidth, maxHeight, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality })
          .toFile(destination);
      } else {
        // Fallback: just copy the file
        await fs.copyFile(file.path, destination);
      }

      // Clean up temporary file
      try {
        await fs.unlink(file.path);
      } catch (err) {
        console.log("Warning: Could not delete temporary file");
      }

      return {
        success: true,
        path: destination,
        size: (await fs.stat(destination)).size,
      };
    } catch (error) {
      console.error("❌ Image processing error:", error);
      throw error;
    }
  },

  // Generate unique filename
  generateFilename(originalName, prefix = "") {
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    return `${prefix}${baseName}_${timestamp}_${random}${ext}`;
  },

  // Delete image file
  async deleteImage(filePath) {
    try {
      await fs.unlink(filePath);
      console.log("✅ Image deleted successfully:", filePath);
      return true;
    } catch (error) {
      console.error("❌ Delete image error:", error);
      return false;
    }
  },

  // Create thumbnail
  async createThumbnail(sourcePath, thumbnailPath, size = 200) {
    try {
      if (typeof sharp !== "undefined") {
        await sharp(sourcePath)
          .resize(size, size, {
            fit: "cover",
            position: "center",
          })
          .jpeg({ quality: 70 })
          .toFile(thumbnailPath);

        return {
          success: true,
          path: thumbnailPath,
        };
      } else {
        throw new Error("Sharp library not available for thumbnail generation");
      }
    } catch (error) {
      console.error("❌ Thumbnail creation error:", error);
      throw error;
    }
  },

  // Get image dimensions
  async getImageDimensions(filePath) {
    try {
      if (typeof sharp !== "undefined") {
        const metadata = await sharp(filePath).metadata();
        return {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: metadata.size,
        };
      } else {
        throw new Error("Sharp library not available for image analysis");
      }
    } catch (error) {
      console.error("❌ Get image dimensions error:", error);
      throw error;
    }
  },

  // Convert image format
  async convertFormat(
    sourcePath,
    targetPath,
    targetFormat = "jpeg",
    quality = 80
  ) {
    try {
      if (typeof sharp !== "undefined") {
        let processor = sharp(sourcePath);

        switch (targetFormat.toLowerCase()) {
          case "jpeg":
          case "jpg":
            processor = processor.jpeg({ quality });
            break;
          case "png":
            processor = processor.png({ quality });
            break;
          case "webp":
            processor = processor.webp({ quality });
            break;
          default:
            throw new Error(`Unsupported target format: ${targetFormat}`);
        }

        await processor.toFile(targetPath);

        return {
          success: true,
          path: targetPath,
          format: targetFormat,
        };
      } else {
        throw new Error("Sharp library not available for format conversion");
      }
    } catch (error) {
      console.error("❌ Image conversion error:", error);
      throw error;
    }
  },
};

module.exports = imageHandler;
