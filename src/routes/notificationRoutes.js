const express = require("express");
const notificationController = require("../controllers/notificationController");
const { authenticate, authorize } = require("../core/middleware");

const router = express.Router();

// Admin Routes
// Admin: Xem tất cả thông báo
router.get(
  "/",
  authenticate,
  authorize(["Admin"]),
  notificationController.getAllNotifications
);

// Admin/Teacher: Tạo và gửi thông báo mới
router.post(
  "/",
  authenticate,
  authorize(["Admin", "Teacher"]),
  notificationController.createNotification
);

// Admin: Thiết lập tự động gửi thông báo vắng mặt và thanh toán
router.post(
  "/auto-notifications",
  authenticate,
  authorize(["Admin"]),
  notificationController.setupAutoNotifications
);

// Admin: Xem cấu hình tự động gửi thông báo
router.get(
  "/auto-settings",
  authenticate,
  authorize(["Admin"]),
  notificationController.getAutoNotificationSettings
);

// Teacher Routes
// Teacher: Xem các thông báo mình đã tạo
router.get(
  "/my-notifications",
  authenticate,
  authorize(["Teacher", "Admin"]),
  notificationController.getMyNotifications
);

// Student/Parent/Teacher Routes
// Xem thông báo theo vai trò của mình
router.get(
  "/for-role",
  authenticate,
  authorize(["Student", "Parent", "Teacher"]),
  notificationController.getNotificationsForRole
);

// Common Routes (All authenticated users)
// Xem chi tiết thông báo
router.get(
  "/:notificationId",
  authenticate,
  notificationController.getNotificationById
);

// Admin/Teacher: Xóa thông báo (chỉ được xóa, không được sửa)
router.delete(
  "/:notificationId",
  authenticate,
  authorize(["Admin", "Teacher"]),
  notificationController.deleteNotification
);

// Admin: Cập nhật cấu hình tự động gửi thông báo
router.patch(
  "/auto-settings/:settingId",
  authenticate,
  authorize(["Admin"]),
  notificationController.updateAutoNotificationSettings
);

// Admin: Trigger manual execution of auto notification
router.post(
  "/auto-settings/:settingId/trigger",
  authenticate,
  authorize(["Admin"]),
  notificationController.triggerManualNotification
);
// Admin: Get scheduler status
router.get(
  "/scheduler/status",
  authenticate,
  authorize(["Admin"]),
  notificationController.getSchedulerStatus
);
// Admin: Xóa cấu hình tự động gửi thông báo
router.delete(
  "/auto-settings/:settingId",
  authenticate,
  authorize(["Admin"]),
  notificationController.deleteAutoNotificationSetting
);

module.exports = router;
