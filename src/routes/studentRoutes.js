const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const { verifyRole } = require("../middleware/authMiddleware");

// Các API cơ bản cho học sinh

// Tạo học sinh mới (chỉ Admin)
router.post("/", verifyRole(["Admin"]), studentController.createNewStudent);

// Lấy danh sách tất cả học sinh (Admin có thể xem)
router.get("/", verifyRole(["Admin"]), studentController.getAllStudents);

// Lấy thông tin chi tiết một học sinh (bao gồm tất cả thông tin cần thiết)
// Admin: xem được tất cả thông tin
// Student: chỉ xem được thông tin của chính mình
// Parent: chỉ xem được thông tin của con mình
router.get(
  "/:studentId",
  verifyRole(["Admin", "Student", "Parent"]),
  studentController.getStudentInfo
);

// Cập nhật thông tin học sinh (chỉ Admin)
router.patch(
  "/:studentId",
  verifyRole(["Admin"]),
  studentController.updateStudent
);

// Xóa học sinh (chỉ Admin)
router.delete(
  "/:studentId",
  verifyRole(["Admin"]),
  studentController.deleteStudent
);

// API mới: Lấy danh sách lớp học có thể tham gia
router.get(
  "/:studentId/available-classes",
  verifyRole(["Admin"]),
  studentController.getAvailableClasses
);

// API chuyên biệt: Đăng ký học sinh vào lớp học với payment
router.post(
  "/:studentId/enroll",
  verifyRole(["Admin"]),
  studentController.enrollToClasses
);

// API chuyên biệt: Loại học sinh khỏi lớp học
router.post(
  "/:studentId/withdraw",
  verifyRole(["Admin"]),
  studentController.withdrawFromClasses
);

module.exports = router;
