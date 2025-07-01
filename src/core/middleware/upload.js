const multer = require("multer");
const { ValidationError } = require("../errors/AppError");

/**
 * Multer Configuration for Image Uploads
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new ValidationError("Chỉ chấp nhận file ảnh"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10, // Maximum 10 files
  },
});

/**
 * Upload Middleware Variants
 */
const uploadSingle = (fieldName = "image") => upload.single(fieldName);
const uploadMultiple = (fieldName = "images", maxCount = 10) =>
  upload.array(fieldName, maxCount);
const uploadFields = (fields) => upload.fields(fields);

/**
 * Error handling for multer
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(
        new ValidationError("File quá lớn. Kích thước tối đa là 5MB")
      );
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return next(new ValidationError("Quá nhiều file. Tối đa 10 file"));
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return next(new ValidationError("Trường file không hợp lệ"));
    }
  }
  next(err);
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleMulterError,
};
