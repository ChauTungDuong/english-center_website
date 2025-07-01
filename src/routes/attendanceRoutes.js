const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const { authenticate, authorize } = require("../core/middleware");

// === 4 API chính cho Attendance Management ===

// 1. Tạo buổi điểm danh mới cho lớp (Admin và Teacher)
router.post(
  "/class/:classId",
  authenticate,
  authorize(["Admin", "Teacher"]),
  attendanceController.createClassAttendance
);

// 2. Thực hiện điểm danh theo buổi (Admin và Teacher)
router.patch(
  "/:attendanceId/mark",
  authenticate,
  authorize(["Admin", "Teacher"]),
  attendanceController.markAttendance
);

// 3. Xóa buổi điểm danh (chỉ Admin)
router.delete(
  "/:attendanceId",
  authenticate,
  authorize(["Admin"]),
  attendanceController.deleteAttendance
);

// 4. Lấy danh sách các buổi điểm danh của 1 lớp
router.get(
  "/class/:classId",
  authenticate,
  authorize(["Admin", "Teacher"]),
  attendanceController.getClassAttendances
);

module.exports = router;
