const logger = require("../utils/logger");

/**
 * Global error handling middleware
 * Catches all errors and sends appropriate response
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Log error details
  logger.error("Error occurred", {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
  });

  // Development: Send full error details
  if (process.env.NODE_ENV === "development") {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }

  // Production: Send clean error message
  // Only send operational errors to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  }

  // Programming or unknown errors: don't leak details
  logger.error("CRITICAL ERROR", err);
  return res.status(500).json({
    success: false,
    status: "error",
    message: "Something went wrong. Please try again later.",
  });
};

/**
 * Catch async errors without try-catch blocks
 * Usage: router.get('/', catchAsync(async (req, res) => {...}))
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Handle 404 errors
 */
const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.originalUrl}`);
  err.statusCode = 404;
  err.isOperational = true;
  next(err);
};

module.exports = {
  errorHandler,
  catchAsync,
  notFound,
};
