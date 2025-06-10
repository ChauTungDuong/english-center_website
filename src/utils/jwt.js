const jwt = require("jsonwebtoken");
require("dotenv").config();

const createToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET);
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
module.exports = {
  createToken,
  verifyToken,
};
