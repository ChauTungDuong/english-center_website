const express = require("express");
const notificationController = require("../controllers/notificationController");
const { auth, checkRole } = require("../middleware");

const router = express.Router();

// Admin Routes
// Admin: Xem tất cả thông báo
router.get(
  "/",
  auth,
  checkRole(["Admin"]),
  notificationController.getAllNotifications
);

// Admin/Teacher: Tạo và gửi thông báo mới
router.post(
  "/",
  auth,
  checkRole(["Admin", "Teacher"]),
  notificationController.createNotification
);

// Admin: Thiết lập tự động gửi thông báo vắng mặt và thanh toán
router.post(
  "/auto-notifications",
  auth,
  checkRole(["Admin"]),
  notificationController.setupAutoNotifications
);

// Admin: Xem cấu hình tự động gửi thông báo
router.get(
  "/auto-settings",
  auth,
  checkRole(["Admin"]),
  notificationController.getAutoNotificationSettings
);

// Teacher Routes
// Teacher: Xem các thông báo mình đã tạo
router.get(
  "/my-notifications",
  auth,
  checkRole(["Teacher", "Admin"]),
  notificationController.getMyNotifications
);

// Student/Parent/Teacher Routes
// Xem thông báo theo vai trò của mình
router.get(
  "/for-role",
  auth,
  checkRole(["Student", "Parent", "Teacher"]),
  notificationController.getNotificationsForRole
);

// Common Routes (All authenticated users)
// Xem chi tiết thông báo
router.get(
  "/:notificationId",
  auth,
  notificationController.getNotificationById
);

// Admin/Teacher: Xóa thông báo (chỉ được xóa, không được sửa)
router.delete(
  "/:notificationId",
  auth,
  checkRole(["Admin", "Teacher"]),
  notificationController.deleteNotification
);
// Admin: Cập nhật cấu hình tự động gửi thông báo
router.patch(
  "/auto-settings/:settingId",
  auth,
  checkRole(["Admin"]),
  notificationController.updateAutoNotificationSettings
);

// Admin: Trigger manual execution of auto notification
router.post(
  "/auto-settings/:settingId/trigger",
  auth,
  checkRole(["Admin"]),
  notificationController.triggerManualNotification
);
// Admin: Get scheduler status
router.get(
  "/scheduler/status",
  auth,
  checkRole(["Admin"]),
  notificationController.getSchedulerStatus
);
// Admin: Xóa cấu hình tự động gửi thông báo
router.delete(
  "/auto-settings/:settingId",
  auth,
  checkRole(["Admin"]),
  notificationController.deleteAutoNotificationSetting
);

module.exports = router;
