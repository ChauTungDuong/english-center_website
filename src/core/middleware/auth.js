const jwt = require("jsonwebtoken");
const { UnauthorizedError, ForbiddenError } = require("../errors/AppError");
const { catchAsync } = require("./errorHandler");
const { User } = require("../../models");

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = catchAsync(async (req, res, next) => {
  // 1) Get token from header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new UnauthorizedError("Vui lòng đăng nhập để truy cập"));
  }

  // 2) Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id).select("+role");
  if (!currentUser) {
    return next(new UnauthorizedError("Người dùng không tồn tại"));
  }

  // 4) Check if user is active
  if (!currentUser.isActive) {
    return next(new UnauthorizedError("Tài khoản đã bị vô hiệu hóa"));
  }

  // 5) Grant access to protected route
  req.user = currentUser;
  next();
});

/**
 * Authorization Middleware
 * Checks if user has required roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError("Vui lòng đăng nhập trước"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Quyền truy cập bị từ chối. Yêu cầu vai trò: ${roles.join(", ")}`
        )
      );
    }

    next();
  };
};

/**
 * Optional Authentication
 * For routes that work with or without authentication
 */
const optionalAuth = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id).select("+role");

      if (currentUser && currentUser.isActive) {
        req.user = currentUser;
      }
    } catch (err) {
      // Invalid token, but continue without user
    }
  }

  next();
});

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
};
