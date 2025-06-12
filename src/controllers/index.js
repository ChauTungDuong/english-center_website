const {
  createNewUser,
  getUserList,
  deleteUser,
  updateUser,
  getUserInfo,
  getProfile,
} = require("./userController");
const { login } = require("./authController");
const { createNewClass, getAllClasses } = require("./classController");

module.exports = {
  createNewUser,
  login,
  createNewClass,
  getAllClasses,
  getUserList,
  deleteUser,
  updateUser,
  getUserInfo,
  getProfile,
};
