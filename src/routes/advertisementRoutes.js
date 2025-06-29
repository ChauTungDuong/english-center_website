const express = require("express");
const advertisementController = require("../controllers/advertisementController");
const { auth, checkRole, upload } = require("../middleware");

const router = express.Router();

// Public Routes (không cần đăng nhập)
// Người dùng khác (không đăng nhập): Xem được các quảng cáo admin đăng
router.get("/public", advertisementController.getPublicAdvertisements);

// Admin Routes (cần đăng nhập và role Admin)
// Admin: Tạo mới quảng cáo (có kèm ảnh)
router.post(
  "/",
  auth,
  checkRole(["Admin"]),
  upload.array("images", 5), // Support multiple images
  advertisementController.createAdvertisement
);

// Admin: Xem tất cả quảng cáo
router.get(
  "/",
  auth,
  checkRole(["Admin"]),
  advertisementController.getAllAdvertisements
);

// Admin: Xem chi tiết quảng cáo
router.get(
  "/:advertisementId",
  auth,
  checkRole(["Admin"]),
  advertisementController.getAdvertisementById
);

// Admin: Sửa quảng cáo (chỉnh sửa thông tin hoặc thay đổi trạng thái)
router.patch(
  "/:advertisementId",
  auth,
  checkRole(["Admin"]),
  upload.array("images", 5), // Support multiple images
  advertisementController.updateAdvertisement
);

// Admin: Xóa quảng cáo
router.delete(
  "/:advertisementId",
  auth,
  checkRole(["Admin"]),
  advertisementController.deleteAdvertisement
);

module.exports = router;
