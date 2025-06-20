const express = require("express");
const router = express.Router();
const announcementController = require("../controllers/announcementController");
const { verifyRole } = require("../middleware/authMiddleware");

// Tạo thông báo mới (chỉ Admin)
router.post(
  "/",
  verifyRole(["Admin"]),
  announcementController.createAnnouncement
);

// Lấy danh sách thông báo đang hoạt động (public)
router.get("/active", announcementController.getActiveAnnouncements);

module.exports = router;
