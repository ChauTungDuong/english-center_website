const express = require("express");
const router = express.Router();
const teacherWageController = require("../controllers/teacherWageController");
const { authenticate, authorize } = require("../core/middleware");

// ========== UNIFIED STATISTICS & LISTING API ==========

// API: Admin xem danh sách lương + thống kê với filter linh hoạt
// Supports: isPaid, month, year, teacherId, includeList, page, limit
// Can return: only statistics, only list, or both (default)
router.get(
  "/",
  authenticate,
  authorize(["Admin"]),
  teacherWageController.getUnifiedWageStatistics
);

// ========== AUTOMATIC WAGE CALCULATION ==========

// API: Tính lương tự động cho tất cả giáo viên trong tháng/năm
router.post(
  "/calculate",
  authenticate,
  authorize(["Admin"]),
  teacherWageController.calculateMonthlyWages
);

// ========== INDIVIDUAL WAGE RECORD MANAGEMENT ==========

// API: Admin xem chi tiết 1 wage record
router.get(
  "/:teacherWageId",
  authenticate,
  authorize(["Admin"]),
  teacherWageController.getWageDetail
);

// API: Admin thanh toán cho 1 wage record cụ thể
router.patch(
  "/:teacherWageId/process",
  authenticate,
  authorize(["Admin"]),
  teacherWageController.processWagePayment
);

// ========== TEACHER SELF-ACCESS ==========

// API: Teacher xem lương của mình (cả đã trả và chưa trả)
router.get(
  "/teacher/:teacherId",
  authenticate,
  authorize(["Admin", "Teacher"]),
  teacherWageController.getTeacherWagesByTeacher
);

// ========== ADMIN CRUD OPERATIONS ==========

// API: Admin cập nhật wage record (chỉnh sửa bảng lương)
router.patch(
  "/:teacherWageId",
  authenticate,
  authorize(["Admin"]),
  teacherWageController.updateWageRecord
);

// API: Admin xóa wage record (nếu cần)
router.delete(
  "/:teacherWageId",
  authenticate,
  authorize(["Admin"]),
  teacherWageController.deleteWageRecord
);

module.exports = router;
