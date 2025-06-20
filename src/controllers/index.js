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

const { getParentChildren, getChildPayments } = require("./parentController");

const {
  generateMonthlyPayment,
  recordPayment,
  calculateTeacherWage,
  getPaymentOverview,
  getTeacherWages,
} = require("./paymentController");

const {
  createAnnouncement,
  getActiveAnnouncements,
} = require("./announcementController");

const {
  getFinancialStatistics,
  getStudentStatistics,
} = require("./statisticController");
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

  // Legacy payment, announcement, statistics exports
  generateMonthlyPayment,
  recordPayment,
  calculateTeacherWage,
  getPaymentOverview,
  getTeacherWages,
  createAnnouncement,
  getActiveAnnouncements,
  getFinancialStatistics,
  getStudentStatistics,
  linkStudentToParent,
  unlinkStudentFromParent,

  // Export controllers directly
  classController,
  attendanceController,
  teacherController,
  studentController,
  parentController,
};
