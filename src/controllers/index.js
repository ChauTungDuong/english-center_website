const {
  createNewUser,
  getUserList,
  deleteUser,
  updateUser,
  getUserInfo,
  getProfile,
} = require("./userController");
const { login } = require("./authController");
const {
  createNewClass,
  getAllClasses,
  getClassDetails,
  updateClass,
  deleteClass,
  getClassSchedule
} = require("./classController");

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
  getClassDetails,
  updateClass,
  deleteClass,
  getClassSchedule
};
