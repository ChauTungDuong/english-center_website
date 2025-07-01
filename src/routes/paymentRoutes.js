const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { authenticate, authorize } = require("../core/middleware");

// ========== ESSENTIAL APIs ONLY ==========

// Payment summary and statistics (Admin thống kê tài chính)
router.get(
  "/summary/overview",
  authenticate,
  authorize(["Admin"]),
  paymentController.getPaymentSummary
);

// Student-specific payment routes (xem payment của học sinh)
router.get(
  "/students/:studentId/payments",
  authenticate,
  authorize(["Admin", "Student", "Parent"]),
  paymentController.getStudentPayments
);

module.exports = router;
