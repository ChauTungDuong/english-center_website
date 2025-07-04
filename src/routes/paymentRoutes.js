const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { verifyRole } = require("../middleware/authMiddleware");

// ========== ESSENTIAL APIs ONLY ==========

// Payment summary and statistics (Admin thống kê tài chính)
router.get(
  "/summary/overview",
  verifyRole(["Admin"]),
  paymentController.getPaymentSummary
);

// Student-specific payment routes (chỉ Admin xem được - phụ huynh có route riêng)
router.get(
  "/students/:studentId/payments",
  verifyRole(["Admin"]),
  paymentController.getStudentPayments
);

// Get all payments with filtering (Admin xem toàn bộ bản ghi học phí)
router.get("/", verifyRole(["Admin"]), paymentController.getAllPayments);

// Get payment by ID (Admin xem chi tiết một bản ghi học phí)
router.get(
  "/:paymentId",
  verifyRole(["Admin"]),
  paymentController.getPaymentById
);

// Update payment (Admin sửa bản ghi học phí)
router.patch(
  "/:paymentId",
  verifyRole(["Admin"]),
  paymentController.updatePayment
);

// Delete payment (Admin xóa bản ghi học phí)
router.delete(
  "/:paymentId",
  verifyRole(["Admin"]),
  paymentController.deletePayment
);

module.exports = router;
