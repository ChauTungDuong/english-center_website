const express = require("express");
const router = express.Router();
const parentPaymentRequestController = require("../controllers/parentPaymentRequestController");
const { verifyRole } = require("../middleware/authMiddleware");
const {
  uploadPaymentProof,
  handleUploadError,
} = require("../middleware/uploadMiddleware");

// ===== PARENT CONVENIENCE ROUTES (không cần parentId) =====

// API: Parent lấy danh sách yêu cầu thanh toán của mình (không cần parentId)
router.get(
  "/my-requests",
  verifyRole(["Parent"]),
  parentPaymentRequestController.getMyPaymentRequests
);

// API: Parent tạo yêu cầu thanh toán (không cần parentId)
router.post(
  "/my-request",
  verifyRole(["Parent"]),
  uploadPaymentProof.fields([
    { name: "proof", maxCount: 1 }, // File ảnh minh chứng
  ]),
  handleUploadError, // Middleware xử lý lỗi upload
  parentPaymentRequestController.createMyPaymentRequest
);

// ===== ADMIN ROUTES =====

// Lấy tất cả yêu cầu thanh toán (chỉ Admin)
router.get(
  "/",
  verifyRole(["Admin"]),
  parentPaymentRequestController.getAllPaymentRequests
);

// Lấy yêu cầu thanh toán theo ID (Admin + Parent sở hữu)
router.get(
  "/:requestId",
  verifyRole(["Admin", "Parent"]),
  parentPaymentRequestController.getPaymentRequestById
);

// Xử lý yêu cầu thanh toán (approve/reject) (chỉ Admin)
router.patch(
  "/:requestId/process",
  verifyRole(["Admin"]),
  parentPaymentRequestController.processPaymentRequest
);

module.exports = router;
