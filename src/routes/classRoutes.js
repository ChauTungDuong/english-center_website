const express = require("express");
const router = express.Router();
const classController = require("../controllers/classController");
const { verifyRole } = require("../middleware/authMiddleware");

// Lấy thống kê tổng quan các lớp học cho dashboard
router.get(
  "/overview",
  verifyRole(["Admin"]),
  classController.getClassesOverview
);

// API đặc biệt cho Teacher
router.get(
  "/available-teachers",
  verifyRole(["Admin"]),
  classController.getAvailableTeachers
);

// Lấy danh sách học sinh available (chưa học lớp này)
router.get(
  "/available-students",
  verifyRole(["Admin"]),
  classController.getAvailableStudents
);
// ✅ REMOVED: Teacher class listing moved to /api/teachers/:teacherId/classes
// This centralizes teacher-related operations in teacherRoutes

// Các API cơ bản cho lớp học

// Tạo lớp học mới (chỉ Admin)
router.post("/", verifyRole(["Admin"]), classController.createNewClass);

// Lấy danh sách tất cả lớp học (Admin có thể xem tất cả, Teacher chỉ xem lớp mình dạy)
router.get(
  "/",
  verifyRole(["Admin", "Teacher"]),
  classController.getAllClasses
);

// Lấy thông tin chi tiết lớp học
router.get(
  "/:classId",
  verifyRole(["Admin", "Teacher"]),
  classController.getClassInfo
);

// Cập nhật thông tin lớp học (chỉ Admin)
router.patch("/:classId", verifyRole(["Admin"]), classController.updateClass);

// Xóa lớp học (chỉ Admin) - có thể soft delete hoặc hard delete
// Query: ?hardDelete=true để xóa hoàn toàn
router.delete("/:classId", verifyRole(["Admin"]), classController.deleteClass);

// APIs cho quản lý giáo viên và học sinh trong class management UI

// Lấy danh sách giáo viên available (chưa dạy lớp này)

module.exports = router;
