const { catchAsync } = require("../core/middleware");
const { ApiResponse } = require("../core/utils");
const NotificationService = require("../services/NotificationService");

const notificationService = new NotificationService();

const notificationController = {
  // Admin/Teacher - Create and send notification
  createNotification: catchAsync(async (req, res) => {
    const { title, content, targetRole, type, method, classId, scheduleType } =
      req.body;
    const { id: userId, role } = req.user;

    // Validate permissions
    if (role === "Teacher" && classId) {
      // Check if teacher is assigned to this class
      const hasPermission =
        await notificationService.checkTeacherClassPermission(userId, classId);
      if (!hasPermission) {
        return ApiResponse.error(
          res,
          "You don't have permission to send notifications to this class",
          403
        );
      }
    }

    const notificationData = {
      title,
      content,
      targetRole,
      type,
      method,
      classId: classId || null,
      scheduleType: scheduleType || "immediate",
      createdBy: userId,
      createdByRole: role,
    };

    const notification = await notificationService.createAndSendNotification(
      notificationData
    );

    return ApiResponse.success(
      res,
      notification,
      "Notification created and sent successfully"
    );
  }),

  // Admin only - Setup auto notifications
  setupAutoNotifications: catchAsync(async (req, res) => {
    const setting = await notificationService.setupAutoNotifications(req.body);
    return ApiResponse.success(
      res,
      setting,
      "Auto notification setup completed"
    );
  }),

  // Admin only - Get auto notification settings
  getAutoNotificationSettings: catchAsync(async (req, res) => {
    const settings = await notificationService.getAutoNotificationSettings();
    return ApiResponse.success(
      res,
      settings,
      "Auto notification settings retrieved"
    );
  }),

  // Admin only - Update auto notification settings
  updateAutoNotificationSettings: catchAsync(async (req, res) => {
    const { id } = req.params;
    const setting = await notificationService.updateAutoNotificationSettings(
      id,
      req.body
    );
    return ApiResponse.success(
      res,
      setting,
      "Auto notification settings updated"
    );
  }),

  // Admin only - Get all notifications with filters
  getAllNotifications: catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      targetRole,
      type,
      method,
      startDate,
      endDate,
      createdBy,
    } = req.query;

    const result = await notificationService.getAllNotifications({
      page: parseInt(page),
      limit: parseInt(limit),
      targetRole,
      type,
      method,
      startDate,
      endDate,
      createdBy,
    });

    return ApiResponse.success(
      res,
      result,
      "Notifications retrieved successfully"
    );
  }),

  // Get notifications for current user's role
  getNotificationsForRole: catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const { id: userId, role } = req.user;

    const result = await notificationService.getNotificationsForRole({
      targetRole: role,
      userId,
      userRole: role,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return ApiResponse.success(
      res,
      result,
      "Notifications retrieved successfully"
    );
  }),

  // Get notification by ID
  getNotificationById: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const notification = await notificationService.getNotificationById(
      id,
      userId,
      role
    );

    return ApiResponse.success(
      res,
      notification,
      "Notification retrieved successfully"
    );
  }),

  // Admin only - Delete notification
  deleteNotification: catchAsync(async (req, res) => {
    const { id } = req.params;

    await notificationService.deleteNotification(id);

    return ApiResponse.success(res, null, "Notification deleted successfully");
  }),

  // Admin/Teacher - Send personalized parent notifications
  sendParentNotifications: catchAsync(async (req, res) => {
    const { classId } = req.body;
    const { id: userId, role } = req.user;

    const notificationData = {
      title: "Thông báo tình hình học tập",
      content: "",
      targetRole: "Parent",
      type: "General",
      method: "email",
      classId: classId || null,
      createdBy: userId,
      createdByRole: role,
    };

    const result =
      await notificationService.sendPersonalizedParentNotifications(
        notificationData
      );

    return ApiResponse.success(
      res,
      result,
      "Parent notifications sent successfully"
    );
  }),

  // Process auto notifications (System endpoint)
  processAutoNotifications: catchAsync(async (req, res) => {
    await notificationService.processAutoNotifications();
    return ApiResponse.success(res, null, "Auto notifications processed");
  }),

  // Teacher: Get notifications created by this teacher
  getMyNotifications: catchAsync(async (req, res) => {
    const { id: userId, role } = req.user;
    const { page = 1, limit = 10 } = req.query;

    const result = await notificationService.getNotificationsByCreator({
      createdBy: userId,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return ApiResponse.success(
      res,
      result,
      "My notifications retrieved successfully"
    );
  }),

  // Admin: Trigger manual notifications
  triggerManualNotification: catchAsync(async (req, res) => {
    const { type } = req.body;

    const result = await notificationService.triggerManualNotification(type);

    return ApiResponse.success(
      res,
      result,
      "Manual notification triggered successfully"
    );
  }),

  // Admin: Get notification scheduler status
  getSchedulerStatus: catchAsync(async (req, res) => {
    const status = await notificationService.getSchedulerStatus();

    return ApiResponse.success(
      res,
      status,
      "Scheduler status retrieved successfully"
    );
  }),

  // Admin: Delete auto notification setting
  deleteAutoNotificationSetting: catchAsync(async (req, res) => {
    const { settingId } = req.params;

    await notificationService.deleteAutoNotificationSetting(settingId);

    return ApiResponse.success(
      res,
      null,
      "Auto notification setting deleted successfully"
    );
  }),
};

module.exports = notificationController;
