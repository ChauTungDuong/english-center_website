/**
 * Custom Application Error Class
 * Provides consistent error handling across the application
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common Error Classes
 */
class ValidationError extends AppError {
  constructor(message = "Dữ liệu không hợp lệ") {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(resource = "Tài nguyên") {
    super(`${resource} không tìm thấy`, 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Không có quyền truy cập") {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Bị cấm truy cập") {
    super(message, 403);
  }
}

class ConflictError extends AppError {
  constructor(message = "Dữ liệu xung đột") {
    super(message, 409);
  }
}

class DatabaseError extends AppError {
  constructor(message = "Lỗi cơ sở dữ liệu") {
    super(message, 500);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DatabaseError,
};
