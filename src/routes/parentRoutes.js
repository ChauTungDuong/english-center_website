const express = require("express");
const router = express.Router();
const parentController = require("../controllers/parentController");
const { verifyRole, checkToken } = require("../middleware/authMiddleware");
const {
  uploadPaymentProof,
  handleUploadError,
} = require("../middleware/uploadMiddleware");

// Các API cơ bản

// ===== PARENT CONVENIENCE ROUTES (không cần parentId) =====
// Đặt ở đầu để tránh conflict với /:parentId
// API tiện ích: Parent lấy thông tin chi tiết các con của mình (không cần parentId)
router.get(
  "/my-children-details",
  verifyRole(["Parent"]),
  parentController.getChildrenWithDetails
);

// API tiện ích: Parent lấy thông tin học phí chưa đóng của các con (không cần parentId)
router.get(
  "/my-unpaid-payments",
  verifyRole(["Parent"]),
  parentController.getChildrenUnpaidPayments
);

// API tiện ích: Parent tạo yêu cầu thanh toán (không cần parentId)
router.post(
  "/my-payment-request",
  verifyRole(["Parent"]),
  uploadPaymentProof.fields([
    { name: "proof", maxCount: 1 }, // File ảnh minh chứng
  ]),
  handleUploadError, // Middleware xử lý lỗi upload
  parentController.createPaymentRequest
);

// API tiện ích: Parent lấy danh sách yêu cầu thanh toán của mình (không cần parentId)
router.get(
  "/my-payment-requests",
  verifyRole(["Parent"]),
  parentController.getPaymentRequests
);

// API mới: Admin lấy tất cả yêu cầu thanh toán (có kèm ảnh)
router.get(
  "/all-payment-requests",
  verifyRole(["Admin"]),
  parentController.getAllPaymentRequests
);

// API mới: Admin xử lý yêu cầu thanh toán (approve/reject)
router.patch(
  "/payment-request/:requestId/process",
  verifyRole(["Admin"]),
  parentController.processPaymentRequest
);

// ===== ADMIN ROUTES =====
router.post("/", verifyRole(["Admin"]), parentController.createNewParent);

// Lấy danh sách tất cả phụ huynh (chỉ Admin)
router.get("/", verifyRole(["Admin"]), parentController.getAllParents);

router.get("/:parentId", verifyRole(["Admin"]), parentController.getParentInfo);

router.patch(
  "/:parentId",
  verifyRole(["Admin"]),
  parentController.updateParent
);
router.delete(
  "/:parentId",
  verifyRole(["Admin"]),
  parentController.deleteParent
);

// Soft delete parent (chỉ Admin)
router.delete(
  "/:parentId/soft",
  verifyRole(["Admin"]),
  parentController.softDeleteParent
);

// ===== ADMIN + PARENT ROUTES (cần parentId) =====
// API mới: Lấy thông tin chi tiết các con kể cả điểm danh và lớp học
router.get(
  "/:parentId/children-details",
  verifyRole(["Parent", "Admin"]),
  parentController.getChildrenWithDetails
);

// API mới: Lấy thông tin học phí chưa đóng của các con
router.get(
  "/:parentId/unpaid-payments",
  verifyRole(["Parent", "Admin"]),
  parentController.getChildrenUnpaidPayments
);

// API mới: Tạo yêu cầu thanh toán
router.post(
  "/:parentId/payment-request",
  verifyRole(["Parent", "Admin"]),
  uploadPaymentProof.fields([
    { name: "proof", maxCount: 1 }, // File ảnh minh chứng
  ]),
  handleUploadError, // Middleware xử lý lỗi upload
  parentController.createPaymentRequest
);

// API mới: Lấy danh sách yêu cầu thanh toán của phụ huynh (có kèm ảnh)
router.get(
  "/:parentId/payment-requests",
  verifyRole(["Parent", "Admin"]),
  parentController.getPaymentRequests
);

// API chuyên biệt: Quản lý quan hệ Parent-Student (bulk update)
// Có thể thêm hoặc xóa nhiều học sinh cho một phụ huynh
// Body: { "action": "add|remove", "studentIds": [...] }
router.patch(
  "/:parentId/children",
  verifyRole(["Admin"]),
  parentController.updateParentChildren
);

module.exports = router;
