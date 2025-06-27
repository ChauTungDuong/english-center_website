const {
  createNewUser,
  getUserList,
  deleteUser,
  updateUser,
  getUserInfo,
  getProfile,
} = require("./userController");
const { login } = require("./authController");
const classController = require("./classController");
const attendanceController = require("./attendanceController");
const teacherController = require("./teacherController");
const studentController = require("./studentController");
const parentController = require("./parentController");
const announcementController = require("./announcementController");
const teacherWageController = require("./teacherWageController");

const { getParentChildren, getChildPayments } = require("./parentController");
const {
  linkStudentToParent,
  unlinkStudentFromParent,
} = require("./parentStudentController");

module.exports = {
  // Legacy user and auth exports
  createNewUser,
  login,
  getUserList,
  deleteUser,
  updateUser,
  getUserInfo,
  getProfile,

  // Legacy function exports for backward compatibility
  linkStudentToParent,
  unlinkStudentFromParent,

  // Export controllers directly
  classController,
  attendanceController,
  teacherController,
  studentController,
  parentController,
  announcementController,
  teacherWageController,
};
