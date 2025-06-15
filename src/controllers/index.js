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
  getClassSchedule,
} = require("./classController");

const { getTeacherClasses } = require("./teacherController");
const {
  createNewAttendance,
  getAttendanceList,
  getAttendanceByLessonNumber,
  takingAttendance,
} = require("./attendanceController");

const {
  getStudentAttendance,
  getStudentClasses,
} = require("./studentController");

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
  getClassSchedule,
  getTeacherClasses,
  createNewAttendance,
  getAttendanceList,
  getAttendanceByLessonNumber,
  takingAttendance,
  getStudentAttendance,
  getStudentClasses,
  getParentChildren,
  getChildPayments,
  generateMonthlyPayment,
  recordPayment,
  createAnnouncement,
  getActiveAnnouncements,
  getFinancialStatistics,
  getStudentStatistics,
  calculateTeacherWage,
  getPaymentOverview,
  getTeacherWages,
};
