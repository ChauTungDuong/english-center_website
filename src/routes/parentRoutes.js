const express = require("express");
const router = express.Router();
const parentController = require("../controllers/parentController");
const { verifyRole } = require("../middleware/authMiddleware");

// Các API cơ bản

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
  "/:parentId/payment-requests",
  verifyRole(["Parent", "Admin"]),
  parentController.createPaymentRequest
);

// API mới: Lấy danh sách yêu cầu thanh toán của phụ huynh
router.get(
  "/:parentId/payment-requests",
  verifyRole(["Parent", "Admin"]),
  parentController.getPaymentRequests
);

// API mới: Quản lý quan hệ Parent-Student (thay thế link/unlink)
router.patch(
  "/:parentId/children",
  verifyRole(["Admin"]),
  parentController.updateParentChildren
);

module.exports = router;
