const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Configuration for payment proof images (temporary storage for Base64 conversion)
const paymentProofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/temp");
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: parentId_paymentId_timestamp.ext
    const { parentId, paymentId } = req.body;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `temp_${parentId || "unknown"}_${
      paymentId || "unknown"
    }_${timestamp}${ext}`;
    cb(null, filename);
  },
});

// File filter for images only
const imageFileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif)!"), false);
  }
};

// Multer configuration for payment proof images
const uploadPaymentProof = multer({
  storage: paymentProofStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        msg: "File quá lớn. Kích thước tối đa là 5MB",
        error: "FILE_TOO_LARGE",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        msg: "Quá nhiều file. Chỉ được upload 1 file",
        error: "TOO_MANY_FILES",
      });
    }
  }

  if (error.message.includes("Chỉ chấp nhận file ảnh")) {
    return res.status(400).json({
      msg: error.message,
      error: "INVALID_FILE_TYPE",
    });
  }

  return res.status(500).json({
    msg: "Lỗi khi upload file",
    error: error.message,
  });
};

// Utility function to get file URL
const getFileUrl = (req, filename) => {
  const protocol = req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}/uploads/payment-proofs/${filename}`;
};

// Clean up old files (optional utility)
const cleanupOldFiles = (directory, maxAge = 30 * 24 * 60 * 60 * 1000) => {
  try {
    const files = fs.readdirSync(directory);
    const now = Date.now();

    files.forEach((file) => {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old file: ${file}`);
      }
    });
  } catch (error) {
    console.error("Error cleaning up old files:", error);
  }
};

module.exports = {
  uploadPaymentProof,
  handleUploadError,
  getFileUrl,
  cleanupOldFiles,
};
