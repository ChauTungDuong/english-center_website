const express = require("express");
const {
  login,
  createNewClass,
  getAllClasses,
  createNewUser,
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
} = require("../controllers");
const {
  studentOverview,
  teacherOverview,
  classOverview,
  classDetails,
  userOverview,
} = require("../services/filterOptions");

const { User, Class } = require("../models");
const { verifyRole, checkToken } = require("../middleware/authMiddleware");
const paginate = require("../middleware/pagination");
const router = express.Router();

// Common API
router.post("/login", login);
router.get("/profile", checkToken, getProfile);

//API for user management
router.post("/user", verifyRole(["Admin"]), createNewUser);
router.delete("/user/:id", verifyRole(["Admin"]), deleteUser);
router.patch("/user/:id", verifyRole(["Admin"]), updateUser);
router.get("/user/:id", verifyRole(["Admin"]), getUserInfo);
router.get(
  "/user",
  verifyRole(["Admin"]),
  paginate(User, userOverview),
  getUserList
);

//API for class management
router.post("/class", verifyRole(["Admin"]), createNewClass);
router.get(
  "/class",
  verifyRole(["Admin"]),
  paginate(Class, classOverview),
  getAllClasses
);
router.get(
  "/class/:classId",
  verifyRole(["Admin"]),
  paginate(Class, classDetails),
  getClassDetails
);
router.get("/class/:classId/schedule", checkToken, getClassSchedule);
router.patch("/class/:classId", verifyRole(["Admin"]), updateClass);
router.delete("/class/:classId", verifyRole(["Admin"]), deleteClass);

//API for attendance management
router.post(
  "/attendance/:classId",
  verifyRole(["Admin", "Teacher"]),
  createNewAttendance
);
router.get(
  "/attendance/:classId/list",
  verifyRole(["Admin", "Teacher"]),
  getAttendanceList
); // cần phân trang
router.get(
  "/attendance/:classId",
  verifyRole(["Admin", "Teacher"]),
  getAttendanceByLessonNumber
);
router.patch(
  "/attendance/:classId",
  verifyRole(["Admin", "Teacher"]),
  takingAttendance
);

//API for teacher and teacher management
router.get(
  "/teacher/:id/classes",
  verifyRole(["Teacher", "Admin"]),
  paginate(Class, classDetails),
  getTeacherClasses
);
router.post(
  "/wage/calculate/:teacherId",
  verifyRole(["Admin"]),
  calculateTeacherWage
);
router.get(
  "/wage/teacher/:teacherId",
  verifyRole(["Admin", "Teacher"]),
  getTeacherWages
);

//API for student
router.get(
  "/student/:id/classes",
  verifyRole(["Student", "Admin"]),
  getStudentClasses
);
router.get(
  "/student/:studentId/attendance/:classId",
  verifyRole(["Student", "Parent", "Admin"]),
  getStudentAttendance
);

// API for parent
router.get(
  "/parent/:id/children",
  verifyRole(["Parent", "Admin"]),
  getParentChildren
);
router.get(
  "/parent/child/:studentId/payments",
  verifyRole(["Parent", "Admin"]),
  getChildPayments
);

// API for payment
router.post("/payment/generate", verifyRole(["Admin"]), generateMonthlyPayment);
router.patch(
  "/payment/:paymentId/record",
  verifyRole(["Admin"]),
  recordPayment
);
router.get("/payment/overview", verifyRole(["Admin"]), getPaymentOverview);
// API for statistics
router.get(
  "/statistics/finance",
  verifyRole(["Admin"]),
  getFinancialStatistics
);
router.get("/statistics/students", verifyRole(["Admin"]), getStudentStatistics);

// API for announcements
router.post("/announcement", verifyRole(["Admin"]), createAnnouncement);
router.get("/announcements", getActiveAnnouncements);

module.exports = router;
