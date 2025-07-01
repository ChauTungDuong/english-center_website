const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const { authenticate, authorize } = require("../core/middleware");

// Các API cơ bản cho học sinh

// Tạo học sinh mới (chỉ Admin)
router.post(
  "/",
  authenticate,
  authorize(["Admin"]),
  studentController.createNewStudent
);

// Lấy danh sách tất cả học sinh (Admin có thể xem)
router.get(
  "/",
  authenticate,
  authorize(["Admin"]),
  studentController.getAllStudents
);

// Lấy thông tin chi tiết một học sinh (bao gồm tất cả thông tin cần thiết)
// Admin: xem được tất cả thông tin
// Student: chỉ xem được thông tin của chính mình
// Parent: chỉ xem được thông tin của con mình
router.get(
  "/:studentId",
  authenticate,
  authorize(["Admin", "Student", "Parent"]),
  studentController.getStudentInfo
);

// Cập nhật thông tin học sinh (chỉ Admin)
// NOTE: API này dùng để cập nhật thông tin cơ bản của học sinh
// Để thêm lớp học cho học sinh với payment và enrollment logic đầy đủ,
// nên sử dụng API POST /:studentId/enroll thay vì API này
router.patch(
  "/:studentId",
  authenticate,
  authorize(["Admin"]),
  studentController.updateStudent
);

// Xóa học sinh (chỉ Admin)
router.delete(
  "/:studentId",
  authenticate,
  authorize(["Admin"]),
  studentController.deleteStudent
);

// Soft delete student (chỉ Admin)
router.delete(
  "/:studentId/soft",
  authenticate,
  authorize(["Admin"]),
  studentController.softDeleteStudent
);

// API mới: Lấy danh sách lớp học có thể tham gia
router.get(
  "/:studentId/available-classes",
  authenticate,
  authorize(["Admin"]),
  studentController.getAvailableClasses
);

// API chuyên biệt: Đăng ký học sinh vào lớp học với payment
// NOTE: Đây là API chính để thêm lớp học cho học sinh
// API này sẽ tự động xử lý việc thêm student vào class.studentList
// và thêm classId vào student.classId, đồng thời tạo payment record
// RECOMMENDED: Sử dụng API này thay vì PATCH /:studentId để thêm lớp học
router.post(
  "/:studentId/enroll",
  authenticate,
  authorize(["Admin"]),
  studentController.enrollToClasses
);

// API chuyên biệt: Loại học sinh khỏi lớp học
router.post(
  "/:studentId/withdraw",
  authenticate,
  authorize(["Admin"]),
  studentController.withdrawFromClasses
);

module.exports = router;
