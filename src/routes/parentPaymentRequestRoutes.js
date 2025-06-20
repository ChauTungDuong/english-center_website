const express = require("express");
const router = express.Router();
const parentPaymentRequestController = require("../controllers/parentPaymentRequestController");
const { verifyRole } = require("../middleware/authMiddleware");

// Lấy tất cả yêu cầu thanh toán (chỉ Admin)
router.get(
  "/",
  verifyRole(["Admin"]),
  parentPaymentRequestController.getAllPaymentRequests
);

// Lấy yêu cầu thanh toán theo ID (chỉ Admin)
router.get(
  "/:requestId",
  verifyRole(["Admin"]),
  parentPaymentRequestController.getPaymentRequestById
);

// Xử lý yêu cầu thanh toán (approve/reject) (chỉ Admin)
router.patch(
  "/:requestId/process",
  verifyRole(["Admin"]),
  parentPaymentRequestController.processPaymentRequest
);

// Phê duyệt yêu cầu thanh toán (chỉ Admin)
router.patch(
  "/:requestId/approve",
  verifyRole(["Admin"]),
  parentPaymentRequestController.approvePaymentRequest
);

// Từ chối yêu cầu thanh toán (chỉ Admin)
router.patch(
  "/:requestId/reject",
  verifyRole(["Admin"]),
  parentPaymentRequestController.rejectPaymentRequest
);

module.exports = router;
