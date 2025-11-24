/**
 * Custom Error class for application errors
 * Extends native Error class with additional properties
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // Operational errors vs programming errors

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
