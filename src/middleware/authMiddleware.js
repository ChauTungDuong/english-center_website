const jwt = require("jsonwebtoken");
const { verifyToken } = require("../utils/jwt");
const authService = require("../services/role_services/authService");
const { User } = require("../models");

const verifyRole = (allowRoles = []) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res
          .status(401)
          .json({ msg: "Unauthorized - No token provided" });
      }

      // Kiểm tra token có bị blacklist không
      const isBlacklisted = await authService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return res
          .status(401)
          .json({ msg: "Token đã bị vô hiệu hóa. Vui lòng đăng nhập lại." });
      }

      const decoded = verifyToken(token);

      // Kiểm tra user có tồn tại và isActive không
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({ msg: "Tài khoản đã bị vô hiệu hóa" });
      }

      req.user = decoded;

      const matchAllowedRoles = allowRoles.includes(decoded.role);
      const isSelf = decoded.id === req.params.id;

      if (!matchAllowedRoles && !isSelf) {
        return res.status(403).json({ msg: "No access for this role" });
      }

      next();
    } catch (error) {
      return res.status(403).json({
        msg: "Forbidden - Invalid token",
        error: error.message,
      });
    }
  };
};

const checkToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ msg: "Unauthorized - No token provided" });
    }

    // Kiểm tra token có bị blacklist không
    const isBlacklisted = await authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res
        .status(401)
        .json({ msg: "Token đã bị vô hiệu hóa. Vui lòng đăng nhập lại." });
    }

    const decoded = verifyToken(token);

    // Kiểm tra user có tồn tại và isActive không
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ msg: "Tài khoản đã bị vô hiệu hóa" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      msg: "Forbidden - Invalid token",
      error: error.message,
    });
  }
};

module.exports = { verifyRole, checkToken };
