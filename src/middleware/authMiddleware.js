const jwt = require("jsonwebtoken");
const { verifyToken } = require("../utils/jwt");

const verifyRole = (allowRoles = []) => {
  return (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ msg: "Unauthorized" });
      }
      const decoded = verifyToken(token);
      req.user = decoded;
      const matchAllowedRoles = allowRoles.includes(decoded.role);
      const isSelf = decoded.id === req.params.id;
      if (!matchAllowedRoles && !isSelf) {
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
const checkToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ msg: "Unauthorized" });
    }
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      msg: "Forbidden",
    });
  }
};
module.exports = { verifyRole, checkToken };
