const fs = require("fs").promises;
const path = require("path");

const sharedImageService = {
  /**
   * Upload image to specified folder
   * @param {Object} file - Multer file object
   * @param {string} folder - Target folder name (e.g., 'advertisements')
   * @returns {string} - Relative URL path to the uploaded image
   */
  uploadImage: async (file, folder = "general") => {
    try {
      if (!file) {
        throw new Error("No file provided");
      }

      // Create target directory structure
      const targetDir = path.join(__dirname, "../../uploads", folder);

      // Ensure target directory exists
      try {
        await fs.access(targetDir);
      } catch (error) {
        // Directory doesn't exist, create it
        await fs.mkdir(targetDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000);
      const extension = path.extname(file.originalname);
      const newFilename = `${folder}_${timestamp}_${randomNum}${extension}`;

      const targetPath = path.join(targetDir, newFilename);

      // Move or copy file from temp to target location
      if (file.path) {
        // File was saved to temp directory, move it
        await fs.rename(file.path, targetPath);
      } else if (file.buffer) {
        // File is in memory, write it
        await fs.writeFile(targetPath, file.buffer);
      } else {
        throw new Error("Invalid file object");
      }

      // Return relative URL path
      return `/uploads/${folder}/${newFilename}`;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  },

  /**
   * Delete image by URL or file path
   * @param {string} imageUrl - URL or file path to delete
   */
  deleteImage: async (imageUrl) => {
    try {
      if (!imageUrl) {
        return; // Nothing to delete
      }

      let filePath;

      // If it's a URL path, convert to absolute path
      if (imageUrl.startsWith("/uploads/")) {
        filePath = path.join(__dirname, "../../", imageUrl);
      } else if (imageUrl.startsWith("uploads/")) {
        filePath = path.join(__dirname, "../../", imageUrl);
      } else {
        // Assume it's already an absolute path
        filePath = imageUrl;
      }

      // Check if file exists and delete it
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log(`Deleted image: ${filePath}`);
      } catch (error) {
        if (error.code === "ENOENT") {
          console.log(`Image file not found (already deleted?): ${filePath}`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      // Don't throw error for image deletion failures as it's not critical
    }
  },

  /**
   * Clean up temporary files older than specified age
   * @param {number} maxAge - Maximum age in milliseconds (default: 24 hours)
   */
  cleanupTempFiles: async (maxAge = 24 * 60 * 60 * 1000) => {
    try {
      const tempDir = path.join(__dirname, "../../uploads/temp");

      try {
        const files = await fs.readdir(tempDir);
        const now = Date.now();

        for (const file of files) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);

          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            console.log(`Cleaned up old temp file: ${file}`);
          }
        }
      } catch (error) {
        if (error.code === "ENOENT") {
          // Temp directory doesn't exist, nothing to clean
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error("Error cleaning up temp files:", error);
    }
  },

  /**
   * Get full URL for an image
   * @param {Object} req - Express request object
   * @param {string} imagePath - Relative image path
   * @returns {string} - Full URL
   */
  getImageUrl: (req, imagePath) => {
    if (!imagePath) return null;

    const protocol = req.protocol;
    const host = req.get("host");

    // Ensure path starts with /
    const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;

    return `${protocol}://${host}${cleanPath}`;
  },

  /**
   * Validate image file
   * @param {Object} file - Multer file object
   * @returns {boolean} - True if valid
   */
  validateImage: (file) => {
    if (!file) return false;

    // Check file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(
        "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."
      );
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("File too large. Maximum size is 5MB.");
    }

    return true;
  },
};

module.exports = sharedImageService;
