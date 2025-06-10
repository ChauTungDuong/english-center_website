const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    password: { type: String, required: true },
    name: String,
    gender: String,
    phoneNumber: String,
    address: String,
    role: String,
  },
  { timestamps: true }
);
const User = mongoose.model("User", userSchema);
module.exports = User;
