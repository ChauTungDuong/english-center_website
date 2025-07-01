// Core Middleware Exports
const { authenticate, authorize, optionalAuth } = require("./auth");
const {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleMulterError,
} = require("./upload");
const {
  validate,
  validateId,
  validatePagination,
  sanitizeInput,
} = require("./validation");
const {
  globalErrorHandler,
  catchAsync,
  handleNotFound,
} = require("./errorHandler");

module.exports = {
  // Authentication & Authorization
  authenticate,
  authorize,
  optionalAuth,

  // File Upload
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleMulterError,

  // Validation
  validate,
  validateId,
  validatePagination,
  sanitizeInput,

  // Error Handling
  globalErrorHandler,
  catchAsync,
  handleNotFound,
};
