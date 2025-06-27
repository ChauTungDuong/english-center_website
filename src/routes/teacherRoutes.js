const express = require("express");
const router = express.Router();
const teacherController = require("../controllers/teacherController");
const { verifyRole } = require("../middleware/authMiddleware");

// CRUD Operations for Teachers
// Tạo giáo viên mới (chỉ Admin)
router.post("/", verifyRole(["Admin"]), teacherController.createNewTeacher);

// Lấy danh sách tất cả giáo viên (Admin có thể xem)
router.get("/", verifyRole(["Admin"]), teacherController.getAllTeachers);

// Lấy thông tin giáo viên theo ID
router.get(
  "/:teacherId",
  verifyRole(["Admin", "Teacher"]),
  teacherController.getTeacherInfo
);

// Cập nhật thông tin giáo viên
router.patch(
  "/:teacherId",
  verifyRole(["Admin"]),
  teacherController.updateTeacher
);

// Xóa giáo viên (chỉ Admin)
router.delete(
  "/:teacherId",
  verifyRole(["Admin"]),
  teacherController.deleteTeacher
);

// Soft delete teacher (chỉ Admin)
router.delete(
  "/:teacherId/soft",
  verifyRole(["Admin"]),
  teacherController.softDeleteTeacher
);

module.exports = router;
