const express = require("express");
const router = express.Router();
const announcementController = require("../controllers/announcementController");
const { verifyRole } = require("../middleware/authMiddleware");

// CRUD Operations for Announcements
// Tạo thông báo mới (Admin và Teacher)
router.post(
  "/",
  verifyRole(["Admin", "Teacher"]),
  announcementController.createAnnouncement
);

// Lấy danh sách tất cả thông báo (Admin có thể xem tất cả)
router.get(
  "/",
  verifyRole(["Admin"]),
  announcementController.getAllAnnouncements
);

// Lấy thông báo đang hoạt động (tất cả roles)
router.get("/active", announcementController.getActiveAnnouncements);

// Lấy thông báo theo ID
router.get("/:announcementId", announcementController.getAnnouncementById);

// Cập nhật thông báo (chỉ Admin)
router.patch(
  "/:announcementId",
  verifyRole(["Admin"]),
  announcementController.updateAnnouncement
);

// Xóa thông báo (chỉ Admin)
router.delete(
  "/:announcementId",
  verifyRole(["Admin"]),
  announcementController.deleteAnnouncement
);

// Cập nhật trạng thái thông báo (chỉ Admin)
router.patch(
  "/:announcementId/status",
  verifyRole(["Admin"]),
  announcementController.updateAnnouncementStatus
);

// Lấy thông báo theo đối tượng
router.get(
  "/audience/:targetAudience",
  announcementController.getAnnouncementsByAudience
);

// Lấy thông báo theo lớp học
router.get("/class/:classId", announcementController.getAnnouncementsByClass);

// Lấy thống kê thông báo (chỉ Admin)
router.get(
  "/statistics/overview",
  verifyRole(["Admin"]),
  announcementController.getAnnouncementStats
);

module.exports = router;
