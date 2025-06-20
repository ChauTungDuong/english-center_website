const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const statisticController = require("../controllers/statisticController");
const { verifyRole } = require("../middleware/authMiddleware");

// RESTful CRUD routes for payments
router.get("/", paymentController.getAllPayments); // GET /api/payments
router.post("/", paymentController.createPayment); // POST /api/payments
router.get("/:paymentId", paymentController.getPaymentById); // GET /api/payments/:paymentId
router.put("/:paymentId", paymentController.updatePayment); // PUT /api/payments/:paymentId
router.delete("/:paymentId", paymentController.deletePayment); // DELETE /api/payments/:paymentId

// Payment record operations
router.post("/:paymentId/records", paymentController.addPaymentRecord); // POST /api/payments/:paymentId/records

// Payment summary and statistics
router.get("/summary/overview", paymentController.getPaymentSummary); // GET /api/payments/summary/overview

// Student-specific payment routes
router.get(
  "/students/:studentId/payments",
  paymentController.getStudentPayments
); // GET /api/payments/students/:studentId/payments

// === Legacy routes for backward compatibility ===

// Tạo thanh toán hàng tháng (legacy - sẽ bị deprecated)
router.post(
  "/generate",
  verifyRole(["Admin"]),
  paymentController.generateMonthlyPayment
);

// Ghi nhận thanh toán (legacy - sẽ bị deprecated, sử dụng POST /:paymentId/records thay thế)
router.patch(
  "/:paymentId/record",
  verifyRole(["Admin"]),
  paymentController.recordPayment
);

// Lấy tổng quan thanh toán (legacy - sẽ bị deprecated, sử dụng GET /summary/overview)
router.get(
  "/overview",
  verifyRole(["Admin"]),
  paymentController.getPaymentOverview
);

// Legacy route mappings (will be deprecated)
router.get("/student/:studentId", paymentController.getStudentPayments); // Legacy: use GET /students/:studentId/payments
router.get("/summary", paymentController.getPaymentSummary); // Legacy: use GET /summary/overview
router.post("/:paymentId/payments", paymentController.addPayment); // Legacy: use POST /:paymentId/records

// Teacher wage routes (should move to separate teacherWageRoutes)
router.post(
  "/teacher-wages/calculate/:teacherId",
  verifyRole(["Admin"]),
  paymentController.calculateTeacherWage
);

router.get(
  "/teacher-wages/:teacherId",
  verifyRole(["Admin", "Teacher"]),
  paymentController.getTeacherWages
);

// Lấy thống kê tài chính (chỉ Admin)
router.get(
  "/statistics/finance",
  verifyRole(["Admin"]),
  statisticController.getFinancialStatistics
);

module.exports = router;
