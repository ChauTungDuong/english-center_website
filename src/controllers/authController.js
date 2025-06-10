const { JsonWebTokenError } = require("jsonwebtoken");
const { User } = require("../models");
const { hashCompare } = require("../services/hashPassGen");

const { createToken } = require("../utils/jwt");

require("dotenv").config();

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email });
  if (!user) {
    return res.status(401).json({ msg: "Email không tồn tại" });
  }
  const isMatch = hashCompare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ msg: "Sai mật khẩu" });
  }
  const token = createToken({
    id: user._id,
    email: user.email,
    role: user.role,
  });
  return res.status(200).json({ token });
};

module.exports = { login };
