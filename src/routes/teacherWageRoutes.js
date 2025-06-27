const express = require("express");
const router = express.Router();
const teacherWageController = require("../controllers/teacherWageController");
const { verifyRole } = require("../middleware/authMiddleware");

// ========== UNIFIED STATISTICS & LISTING API ==========

// API: Admin xem danh sách lương + thống kê với filter linh hoạt
// Supports: isPaid, month, year, teacherId, includeList, page, limit
// Can return: only statistics, only list, or both (default)
router.get(
  "/",
  verifyRole(["Admin"]),
  teacherWageController.getUnifiedWageStatistics
);

// ========== AUTOMATIC WAGE CALCULATION ==========

// API: Tính lương tự động cho tất cả giáo viên trong tháng/năm
router.post(
  "/calculate",
  verifyRole(["Admin"]),
  teacherWageController.calculateMonthlyWages
);

// ========== INDIVIDUAL WAGE RECORD MANAGEMENT ==========

// API: Admin xem chi tiết 1 wage record
router.get(
  "/:teacherWageId",
  verifyRole(["Admin"]),
  teacherWageController.getWageDetail
);

// API: Admin thanh toán cho 1 wage record cụ thể
router.patch(
  "/:teacherWageId/process",
  verifyRole(["Admin"]),
  teacherWageController.processWagePayment
);

// ========== TEACHER SELF-ACCESS ==========

// API: Teacher xem lương của mình (cả đã trả và chưa trả)
router.get(
  "/teacher/:teacherId",
  verifyRole(["Admin", "Teacher"]),
  teacherWageController.getTeacherWagesByTeacher
);

// ========== ADMIN CRUD OPERATIONS ==========

// API: Admin cập nhật wage record (chỉnh sửa bảng lương)
router.patch(
  "/:teacherWageId",
  verifyRole(["Admin"]),
  teacherWageController.updateWageRecord
);

// API: Admin xóa wage record (nếu cần)
router.delete(
  "/:teacherWageId",
  verifyRole(["Admin"]),
  teacherWageController.deleteWageRecord
);

module.exports = router;
