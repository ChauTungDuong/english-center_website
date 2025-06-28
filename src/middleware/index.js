const { verifyRole } = require("./authMiddleware");
const { upload } = require("./uploadMiddleware");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../utils/jwt");
const { User } = require("../models");

// Basic auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No token provided",
      });
    }

    const decoded = verifyToken(token);

    // Kiểm tra user có tồn tại và isActive không
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản đã bị vô hiệu hóa",
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Forbidden - Invalid token",
      error: error.message,
    });
  }
};

// Check role middleware
const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error checking role",
        error: error.message,
      });
    }
  };
};

module.exports = {
  auth,
  checkRole,
  verifyRole,
  upload,
};
