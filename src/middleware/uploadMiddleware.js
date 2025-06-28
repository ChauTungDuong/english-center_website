const multer = require("multer");

// Memory storage - no file system storage, keep files in memory as Buffer
const memoryStorage = multer.memoryStorage();

// File filter for images only
const imageFileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif)!"), false);
  }
};

// Multer configuration for payment proof images (memory storage)
const uploadPaymentProof = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Multer configuration for advertisement images (memory storage)
const uploadAnnouncementImage = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// General upload configuration for advertisements (memory storage)
const upload = multer({
  storage: memoryStorage,
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
        msg: "Quá nhiều file. Tối đa 5 file",
        error: "TOO_MANY_FILES",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        msg: "Tên field không đúng. Sử dụng 'images'",
        error: "UNEXPECTED_FIELD",
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

module.exports = {
  uploadPaymentProof,
  uploadAnnouncementImage,
  upload,
  handleUploadError,
};
