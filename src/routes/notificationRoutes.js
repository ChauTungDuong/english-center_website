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

// Admin/Teacher: Tạo thông báo mới
router.post(
  "/",
  auth,
  checkRole(["Admin", "Teacher"]),
  notificationController.createNotification
);

// Admin: Get notification statistics
router.get(
  "/statistics",
  auth,
  checkRole(["Admin"]),
  notificationController.getNotificationStatistics
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
router.get("/:id", auth, notificationController.getNotificationById);

// Admin/Teacher: Cập nhật thông báo
router.put(
  "/:id",
  auth,
  checkRole(["Admin", "Teacher"]),
  notificationController.updateNotification
);

// Admin/Teacher: Xóa thông báo
router.delete(
  "/:id",
  auth,
  checkRole(["Admin", "Teacher"]),
  notificationController.deleteNotification
);

// Admin/Teacher: Gửi thông báo qua email
router.post(
  "/:id/send-email",
  auth,
  checkRole(["Admin", "Teacher"]),
  notificationController.sendNotificationEmail
);

module.exports = router;
