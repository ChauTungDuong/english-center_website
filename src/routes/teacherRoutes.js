const express = require("express");
const router = express.Router();
const teacherController = require("../controllers/teacherController");
const paymentController = require("../controllers/paymentController");
const { verifyRole } = require("../middleware/authMiddleware");

// CRUD Operations for Teachers
// Tạo giáo viên mới (chỉ Admin)
router.post("/", verifyRole(["Admin"]), teacherController.createNewTeacher);

// Lấy danh sách tất cả giáo viên (Admin và Teacher có thể xem)
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

// Lấy danh sách lớp học của giáo viên - UNIFIED API
// Admin: có thể xem lớp của bất kỳ teacher nào
// Teacher: chỉ có thể xem lớp của chính mình (với authorization check trong controller)
router.get(
  "/:id/classes",
  verifyRole(["Teacher", "Admin"]),
  teacherController.getTeacherClasses
);

// Payment related routes
// Tính lương giáo viên (chỉ Admin)
router.post(
  "/:teacherId/calculate",
  verifyRole(["Admin"]),
  paymentController.calculateTeacherWage
);

// Lấy thông tin lương giáo viên
router.get(
  "/:teacherId/wage",
  verifyRole(["Admin", "Teacher"]),
  paymentController.getTeacherWages
);

module.exports = router;
