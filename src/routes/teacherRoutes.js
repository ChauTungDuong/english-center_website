const express = require("express");
const router = express.Router();
const teacherController = require("../controllers/teacherController");
const { authenticate, authorize } = require("../core/middleware");

// CRUD Operations for Teachers
// Tạo giáo viên mới (chỉ Admin)
router.post(
  "/",
  authenticate,
  authorize(["Admin"]),
  teacherController.createNewTeacher
);

// Lấy danh sách tất cả giáo viên (Admin có thể xem)
router.get(
  "/",
  authenticate,
  authorize(["Admin"]),
  teacherController.getAllTeachers
);

// Lấy thông tin giáo viên theo ID
router.get(
  "/:teacherId",
  authenticate,
  authorize(["Admin", "Teacher"]),
  teacherController.getTeacherInfo
);

// Cập nhật thông tin giáo viên
router.patch(
  "/:teacherId",
  authenticate,
  authorize(["Admin"]),
  teacherController.updateTeacher
);

// Xóa giáo viên (chỉ Admin)
router.delete(
  "/:teacherId",
  authenticate,
  authorize(["Admin"]),
  teacherController.deleteTeacher
);

// Soft delete teacher (chỉ Admin)
router.delete(
  "/:teacherId/soft",
  authenticate,
  authorize(["Admin"]),
  teacherController.softDeleteTeacher
);

module.exports = router;
