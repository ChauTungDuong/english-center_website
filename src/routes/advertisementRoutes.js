const express = require("express");
const advertisementController = require("../controllers/advertisementController");
const { authenticate, authorize } = require("../core/middleware");
const { upload, handleUploadError } = require("../middleware/uploadMiddleware");

const router = express.Router();

// Public Routes (không cần đăng nhập)
// Người dùng khác (không đăng nhập): Xem được các quảng cáo admin đăng
router.get("/public", advertisementController.getPublicAdvertisements);

// Admin Routes (cần đăng nhập và role Admin)
// Admin: Tạo mới quảng cáo (có kèm ảnh)
router.post(
  "/",
  authenticate,
  authorize(["Admin"]),
  upload.array("images", 5), // Support multiple images
  handleUploadError,
  advertisementController.createAdvertisement
);

// Admin: Xem tất cả quảng cáo
router.get(
  "/",
  authenticate,
  authorize(["Admin"]),
  advertisementController.getAllAdvertisements
);

// Admin: Xem chi tiết quảng cáo
router.get(
  "/:advertisementId",
  authenticate,
  authorize(["Admin"]),
  advertisementController.getAdvertisementById
);

// Admin: Sửa quảng cáo (chỉnh sửa thông tin hoặc thay đổi trạng thái)
router.patch(
  "/:advertisementId",
  authenticate,
  authorize(["Admin"]),
  upload.array("images", 5), // Support multiple images
  handleUploadError,
  advertisementController.updateAdvertisement
);

// Admin: Xóa quảng cáo
router.delete(
  "/:advertisementId",
  authenticate,
  authorize(["Admin"]),
  advertisementController.deleteAdvertisement
);

module.exports = router;
