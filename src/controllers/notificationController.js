const notificationService = require("../services/role_services/notificationService");

const notificationController = {
  // Admin/Teacher - Create and send notification
  async createNotification(req, res) {
    try {
      const {
        title,
        content,
        targetRole,
        type,
        method,
        classId,
        scheduleType,
      } = req.body;
      const { id: userId, role } = req.user;

      // Validate required fields
      if (!title || !content || !targetRole || !type || !method) {
        return res.status(400).json({
          success: false,
          message: "Title, content, targetRole, type, and method are required",
        });
      }

      // Validate permissions
      if (role === "Teacher" && classId) {
        // Check if teacher is assigned to this class
        const hasPermission =
          await notificationService.checkTeacherClassPermission(
            userId,
            classId
          );
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message:
              "You don't have permission to send notifications to this class",
          });
        }
      }

      const notificationData = {
        title,
        content,
        targetRole,
        type,
        method, // 'web', 'email', 'both'
        classId: classId || null,
        scheduleType: scheduleType || "immediate", // 'immediate', 'daily', 'monthly'
        createdBy: userId,
        createdByRole: role,
        notificationDate: new Date(),
        isActive: true,
      };

      const notification = await notificationService.createAndSendNotification(
        notificationData
      );

      res.status(201).json({
        success: true,
        data: notification,
        message: "Notification created and sent successfully",
      });
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create notification",
        error: error.message,
      });
    }
  },

  // Admin only - Setup auto attendance and payment notifications
  async setupAutoNotifications(req, res) {
    try {
      const { classId, scheduleType, isActive } = req.body;
      const { id: userId } = req.user;

      if (!classId || !scheduleType) {
        return res.status(400).json({
          success: false,
          message: "classId and scheduleType are required",
        });
      }

      if (!["hourly", "daily", "monthly"].includes(scheduleType)) {
        return res.status(400).json({
          success: false,
          message: "scheduleType must be 'hourly', 'daily' or 'monthly'",
        });
      }

      const autoSetting = await notificationService.setupAutoNotifications({
        classId,
        scheduleType,
        createdBy: userId,
        isActive: isActive !== undefined ? isActive : true,
      });

      res.status(201).json({
        success: true,
        data: autoSetting,
        message: "Auto notification settings configured successfully",
      });
    } catch (error) {
      console.error("Error setting up auto notifications:", error);
      res.status(500).json({
        success: false,
        message: "Failed to setup auto notifications",
        error: error.message,
      });
    }
  },

  // Admin only - Get auto notification settings
  async getAutoNotificationSettings(req, res) {
    try {
      const settings = await notificationService.getAutoNotificationSettings();

      res.json({
        success: true,
        data: settings,
        message: "Auto notification settings retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting auto notification settings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve auto notification settings",
        error: error.message,
      });
    }
  },

  // Admin only - Update auto notification settings
  async updateAutoNotificationSettings(req, res) {
    try {
      const { settingId } = req.params;
      const { scheduleType, isActive } = req.body;

      const updateData = {};
      if (scheduleType !== undefined) updateData.scheduleType = scheduleType;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedSetting =
        await notificationService.updateAutoNotificationSettings(
          settingId,
          updateData
        );

      if (!updatedSetting) {
        return res.status(404).json({
          success: false,
          message: "Auto notification setting not found",
        });
      }

      res.json({
        success: true,
        data: updatedSetting,
        message: "Auto notification settings updated successfully",
      });
    } catch (error) {
      console.error("Error updating auto notification settings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update auto notification settings",
        error: error.message,
      });
    }
  },

  // Admin only - Get all notifications with pagination and filtering
  async getAllNotifications(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        targetRole,
        createdByRole,
        search,
      } = req.query;

      // Ensure page and limit are valid numbers
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;

      const filters = {};

      if (type && type !== "") filters.type = type;
      if (targetRole && targetRole !== "") filters.targetRole = targetRole;
      if (createdByRole && createdByRole !== "")
        filters.createdByRole = createdByRole;

      if (search) {
        filters.$or = [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
        ];
      }

      const result = await notificationService.getAllNotifications({
        page: pageNum,
        limit: limitNum,
        filters,
      });

      res.json({
        success: true,
        data: result.notifications,
        pagination: {
          currentPage: result.pagination.currentPage,
          totalPages: result.pagination.totalPages,
          totalItems: result.pagination.totalItems,
          itemsPerPage: result.pagination.limit,
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
  },

  // Teacher/Admin - Get notifications created by current user
  async getMyNotifications(req, res) {
    try {
      const { page = 1, limit = 10, type } = req.query;
      const { id: userId } = req.user;

      // Ensure page and limit are valid numbers
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;

      const filters = { createdBy: userId };

      if (type && type !== "") filters.type = type;

      const result = await notificationService.getAllNotifications({
        page: pageNum,
        limit: limitNum,
        filters,
      });

      res.json({
        success: true,
        data: result.notifications,
        pagination: {
          currentPage: result.pagination.currentPage,
          totalPages: result.pagination.totalPages,
          totalItems: result.pagination.totalItems,
          itemsPerPage: result.pagination.limit,
        },
        message: "My notifications retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting my notifications:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve my notifications",
        error: error.message,
      });
    }
  },

  // Student/Parent/Teacher - Get notifications for current user's role
  async getNotificationsForRole(req, res) {
    try {
      const { page = 1, limit = 10, type } = req.query;
      const { id: userId, role } = req.user;

      // Ensure page and limit are valid numbers
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;

      const result = await notificationService.getNotificationsForRole({
        userId,
        role,
        page: pageNum,
        limit: limitNum,
        type,
      });

      res.json({
        success: true,
        data: result.notifications,
        pagination: {
          currentPage: result.pagination.currentPage,
          totalPages: result.pagination.totalPages,
          totalItems: result.pagination.totalItems,
          itemsPerPage: result.pagination.limit,
        },
        message: "Notifications for role retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting notifications for role:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve notifications for role",
        error: error.message,
      });
    }
  },

  // All authenticated users - Get notification by ID
  async getNotificationById(req, res) {
    try {
      const { notificationId } = req.params;
      const { id: userId, role } = req.user;

      const notification = await notificationService.getNotificationById(
        notificationId,
        userId,
        role
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found or you don't have permission to view it",
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
  },

  // Admin/Teacher - Delete notification (only delete, no update allowed)
  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const { id: userId, role } = req.user;

      // Check if user has permission to delete this notification
      const notification = await notificationService.getNotificationById(
        notificationId
      );
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }

      // Admin can delete any notification, Teacher can only delete their own
      if (role !== "Admin" && notification.createdBy.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to delete this notification",
        });
      }

      await notificationService.deleteNotification(notificationId);

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
  },

  // Admin: Trigger manual execution of auto notification
  async triggerManualNotification(req, res) {
    try {
      const { settingId } = req.params;
      const notificationScheduler = require("../utils/notificationScheduler");

      const result = await notificationScheduler.triggerManualExecution(
        settingId
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      console.error("Error triggering manual notification:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to trigger manual notification",
      });
    }
  },

  // Admin: Get scheduler status
  async getSchedulerStatus(req, res) {
    try {
      const notificationScheduler = require("../utils/notificationScheduler");
      const status = notificationScheduler.getStatus();

      res.status(200).json({
        success: true,
        message: "Scheduler status retrieved successfully",
        data: {
          jobs: status,
          totalJobs: status.length,
          runningJobs: status.filter((job) => job.running).length,
        },
      });
    } catch (error) {
      console.error("Error getting scheduler status:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get scheduler status",
      });
    }
  },

  // Admin only - Delete auto notification setting
  async deleteAutoNotificationSetting(req, res) {
    try {
      const { settingId } = req.params;

      if (!settingId) {
        return res.status(400).json({
          success: false,
          message: "Setting ID is required",
        });
      }

      const result = await notificationService.deleteAutoNotificationSetting(
        settingId
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.deletedSetting,
      });
    } catch (error) {
      console.error("Error deleting auto notification setting:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete auto notification setting",
      });
    }
  },
};

module.exports = notificationController;
