const { createNewUser } = require("./userController");
const { login } = require("./authController");
const { createNewClass, getAllClasses } = require("./classController");

module.exports = {
  createNewUser,
  login,
  createNewClass,
  getAllClasses,
};
