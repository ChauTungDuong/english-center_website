const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const { verifyRole } = require("../middleware/authMiddleware");

// === 3 API chính cho Attendance Management ===

// 1. Tạo buổi điểm danh mới cho lớp (Admin và Teacher)
router.post(
  "/class/:classId",
  verifyRole(["Admin", "Teacher"]),
  attendanceController.createClassAttendance
);

// 2. Thực hiện điểm danh theo buổi (Admin và Teacher)
router.patch(
  "/:attendanceId/mark",
  verifyRole(["Admin", "Teacher"]),
  attendanceController.markAttendance
);

// 3. Xóa điểm danh khi cần (chỉ Admin)
router.delete(
  "/:attendanceId",
  verifyRole(["Admin"]),
  attendanceController.deleteAttendance
);

// 4. Lấy danh sách các buổi điểm danh của 1 lớp
router.get(
  "/class/:classId",
  verifyRole(["Admin", "Teacher"]),
  attendanceController.getClassAttendances
);

module.exports = router;
