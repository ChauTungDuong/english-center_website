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

// Student-specific payment routes (xem payment của học sinh)
router.get(
  "/students/:studentId/payments",
  verifyRole(["Admin", "Student", "Parent"]),
  paymentController.getStudentPayments
);

module.exports = router;
