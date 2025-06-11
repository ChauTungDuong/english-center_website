const { default: mongoose } = require("mongoose");

require("dotenv").config();

const connection = async () => {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log("Ket noi toi DB thanh cong");
  } catch (err) {
    console.log("Error : ", err);
  }
};

const createAdminIfNotExist = async () => {
  const User = require("../models/User");
  const { hashing } = require("../services/hashPassGen");

  const admin = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (!admin) {
    const hashPass = await hashing(process.env.ADMIN_PASSWORD);
    await User.create({
      name: "Admin",
      email: process.env.ADMIN_EMAIL,
      password: hashPass,
      role: "Admin",
    });
    console.log("Admin created successfully");
  } else {
    console.log("Admin already exists");
  }
};

module.exports = {
  connection,
  createAdminIfNotExist,
};
