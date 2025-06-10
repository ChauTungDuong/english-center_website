const jwt = require("jsonwebtoken");
const { verifyToken } = require("../utils/jwt");

const verifyRole = (allowRoles) => {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ msg: "Unauthorized" });
    }
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      if (!allowRoles.includes(decoded.role)) {
        return res.status(403).json({ msg: "No access for this role" });
      }
      next();
    } catch (error) {
      return res.status(403).json({
        msg: "Forbidden",
      });
    }
  };
};

module.exports = verifyRole;
