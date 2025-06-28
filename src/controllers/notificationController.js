const notificationService = require("../services/role_services/notificationService");

// Admin/Teacher - Create new notification
// POST /api/notifications
const createNotification = async (req, res) => {
  try {
    const { title, content, targetRole, type, method, classId } = req.body;
    const { userId, role } = req.user;

    // Validate required fields
    if (!title || !content || !targetRole || !type || !method) {
      return res.status(400).json({
        success: false,
        message: "Title, content, targetRole, type, and method are required",
      });
    }

    const notificationData = {
      title,
      content,
      targetRole,
      type,
      method,
      classId: classId || null,
      createdBy: userId,
      createdByRole: role,
      notificationDate: new Date(),
      isActive: true,
    };

    const notification = await notificationService.createNotification(
      notificationData
    );

    res.status(201).json({
      success: true,
      data: notification,
      message: "Notification created successfully",
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create notification",
      error: error.message,
    });
  }
};

// Admin only - Get all notifications with pagination and filtering
// GET /api/notifications
const getAllNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      targetRole,
      type,
      isActive,
      createdBy,
    } = req.query;
    const filters = {};

    if (targetRole) filters.targetRole = targetRole;
    if (type) filters.type = type;
    if (isActive !== undefined) filters.isActive = isActive === "true";
    if (createdBy) filters.createdBy = createdBy;

    const result = await notificationService.getAllNotifications({
      page: parseInt(page),
      limit: parseInt(limit),
      filters,
    });

    res.json({
      success: true,
      data: result.notifications,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        itemsPerPage: result.itemsPerPage,
      },
      message: "Notifications retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting all notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications",
      error: error.message,
    });
  }
};

// Teacher/Admin - Get notifications created by current user
// GET /api/notifications/my-notifications
const getMyNotifications = async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 10 } = req.query;

    const result = await notificationService.getNotificationsByCreator(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: result.notifications,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        itemsPerPage: result.itemsPerPage,
      },
      message: "Your notifications retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting my notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve your notifications",
      error: error.message,
    });
  }
};

// Student/Parent/Teacher - Get notifications for their role
// GET /api/notifications/for-role
const getNotificationsForRole = async (req, res) => {
  try {
    const { role, classId } = req.user; // classId from user context for students
    const { page = 1, limit = 10, type } = req.query;

    const filters = { targetRole: { $in: [role, "All"] } };
    if (type) filters.type = type;
    if (classId) filters.$or = [{ classId: classId }, { classId: null }];

    const result = await notificationService.getNotificationsForRole(role, {
      page: parseInt(page),
      limit: parseInt(limit),
      filters,
    });

    res.json({
      success: true,
      data: result.notifications,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        itemsPerPage: result.itemsPerPage,
      },
      message: "Notifications for your role retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting notifications for role:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications for your role",
      error: error.message,
    });
  }
};

// All authenticated users - Get notification by ID
// GET /api/notifications/:id
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.getNotificationById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      data: notification,
      message: "Notification retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting notification by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve notification",
      error: error.message,
    });
  }
};

// Admin/Teacher - Update notification
// PUT /api/notifications/:id
const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, targetRole, type, method, classId, isActive } =
      req.body;
    const { userId, role } = req.user;

    // Check if notification exists and user has permission
    const existingNotification = await notificationService.getNotificationById(
      id
    );
    if (!existingNotification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Only admin or the creator can update
    if (
      role !== "Admin" &&
      existingNotification.createdBy.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own notifications",
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (targetRole) updateData.targetRole = targetRole;
    if (type) updateData.type = type;
    if (method) updateData.method = method;
    if (classId !== undefined) updateData.classId = classId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedNotification = await notificationService.updateNotification(
      id,
      updateData
    );

    res.json({
      success: true,
      data: updatedNotification,
      message: "Notification updated successfully",
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notification",
      error: error.message,
    });
  }
};

// Admin/Teacher - Delete notification
// DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    // Check if notification exists and user has permission
    const existingNotification = await notificationService.getNotificationById(
      id
    );
    if (!existingNotification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Only admin or the creator can delete
    if (
      role !== "Admin" &&
      existingNotification.createdBy.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own notifications",
      });
    }

    await notificationService.deleteNotification(id);

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};

// Admin/Teacher - Send notification email
// POST /api/notifications/:id/send-email
const sendNotificationEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    // Check if notification exists and user has permission
    const notification = await notificationService.getNotificationById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Only admin or the creator can send emails
    if (role !== "Admin" && notification.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only send emails for your own notifications",
      });
    }

    // Check if notification method supports email
    if (!["email", "both"].includes(notification.method)) {
      return res.status(400).json({
        success: false,
        message: "This notification is not configured for email delivery",
      });
    }

    const result = await notificationService.sendNotificationEmail(id);

    res.json({
      success: true,
      data: result,
      message: "Notification email sent successfully",
    });
  } catch (error) {
    console.error("Error sending notification email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send notification email",
      error: error.message,
    });
  }
};

// Admin only - Get notification statistics
// GET /api/notifications/statistics
const getNotificationStatistics = async (req, res) => {
  try {
    const statistics = await notificationService.getNotificationStatistics();

    res.json({
      success: true,
      data: statistics,
      message: "Notification statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting notification statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve notification statistics",
      error: error.message,
    });
  }
};

module.exports = {
  createNotification,
  getAllNotifications,
  getMyNotifications,
  getNotificationsForRole,
  getNotificationById,
  updateNotification,
  deleteNotification,
  sendNotificationEmail,
  getNotificationStatistics,
};
