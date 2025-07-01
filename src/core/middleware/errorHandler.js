const { AppError } = require("../errors/AppError");

/**
 * Global Error Handler Middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details for debugging
  console.error("ERROR 💥:", {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "ID không hợp lệ";
    error = new AppError(message, 400);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const value = err.errmsg
      ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0]
      : "unknown";
    const message = `Dữ liệu đã tồn tại: ${value}`;
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((val) => val.message);
    const message = `Dữ liệu không hợp lệ: ${errors.join(". ")}`;
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Token không hợp lệ";
    error = new AppError(message, 401);
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token đã hết hạn";
    error = new AppError(message, 401);
  }

  // Send error response
  if (error.isOperational) {
    res.status(error.statusCode).json({
      success: false,
      status: error.status,
      message: error.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    res.status(500).json({
      success: false,
      status: "error",
      message: "Đã xảy ra lỗi hệ thống",
    });
  }
};

/**
 * Catch Async Wrapper
 * Eliminates need for try-catch in async controllers
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Handle Unhandled Routes
 */
const handleNotFound = (req, res, next) => {
  const err = new AppError(`Route ${req.originalUrl} không tồn tại`, 404);
  next(err);
};

module.exports = {
  globalErrorHandler,
  catchAsync,
  handleNotFound,
};
