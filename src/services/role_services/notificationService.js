const Notification = require("../../models/Notification");
const { Class, User } = require("../../models");

const notificationService = {
  // Create new notification
  createNotification: async (notificationData) => {
    try {
      // Validate required fields
      const { title, content, targetRole, type, createdBy, createdByRole } =
        notificationData;

      if (
        !title ||
        !content ||
        !targetRole ||
        !type ||
        !createdBy ||
        !createdByRole
      ) {
        throw new Error(
          "Title, content, targetRole, type, createdBy, and createdByRole are required"
        );
      }

      // Validate targetRole
      const validTargetRoles = ["Student", "Parent", "Teacher", "All"];
      if (!validTargetRoles.includes(targetRole)) {
        throw new Error("Invalid targetRole");
      }

      // Validate type
      const validTypes = [
        "General",
        "ClassAbsence",
        "PaymentReminder",
        "System",
        "Event",
      ];
      if (!validTypes.includes(type)) {
        throw new Error("Invalid notification type");
      }

      // Validate method if provided
      if (notificationData.method) {
        const validMethods = ["web", "email", "both"];
        if (!validMethods.includes(notificationData.method)) {
          throw new Error("Invalid notification method");
        }
      }

      // If classId is provided, validate it exists
      if (notificationData.classId) {
        const classExists = await Class.findById(notificationData.classId);
        if (!classExists) {
          throw new Error("Class not found");
        }
      }

      const notification = new Notification(notificationData);
      await notification.save();

      // Populate references for response
      await notification.populate("createdBy", "fullName email role");
      if (notification.classId) {
        await notification.populate("classId", "className grade");
      }

      return notification;
    } catch (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }
  },

  // Get all notifications with pagination and filters
  getAllNotifications: async (options = {}) => {
    try {
      const {
        page = 1,
        limit = 10,
        targetRole,
        type,
        isActive,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      const filter = {};
      if (targetRole) filter.targetRole = targetRole;
      if (type) filter.type = type;
      if (isActive !== undefined) filter.isActive = isActive;

      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find(filter)
          .populate("createdBy", "fullName email role")
          .populate("classId", "className grade")
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Notification.countDocuments(filter),
      ]);

      return {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          limit,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get notifications: ${error.message}`);
    }
  },

  // Get notifications by creator
  getNotificationsByCreator: async (createdBy, options = {}) => {
    try {
      const { page = 1, limit = 10, type, isActive } = options;

      const filter = { createdBy };
      if (type) filter.type = type;
      if (isActive !== undefined) filter.isActive = isActive;

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find(filter)
          .populate("classId", "className grade")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments(filter),
      ]);

      return {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          limit,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get notifications by creator: ${error.message}`
      );
    }
  },

  // Get notifications for a specific role
  getNotificationsForRole: async (userRole, userId, options = {}) => {
    try {
      const { page = 1, limit = 10, type, classId } = options;

      const filter = {
        $or: [{ targetRole: userRole }, { targetRole: "All" }],
        isActive: true,
      };

      if (type) filter.type = type;
      if (classId) filter.classId = classId;

      // For students/parents, also check if they belong to specific classes
      if (userRole === "Student" || userRole === "Parent") {
        // Get user's classes
        const user = await User.findById(userId).populate("classes");
        if (user && user.classes && user.classes.length > 0) {
          const userClassIds = user.classes.map((cls) => cls._id);
          filter.$or.push({ classId: { $in: userClassIds } });
        }
      }

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find(filter)
          .populate("createdBy", "fullName role")
          .populate("classId", "className grade")
          .sort({ notificationDate: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments(filter),
      ]);

      return {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          limit,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get notifications for role: ${error.message}`);
    }
  },

  // Get notification by ID
  getNotificationById: async (id) => {
    try {
      const notification = await Notification.findById(id)
        .populate("createdBy", "fullName email role")
        .populate("classId", "className grade");

      return notification;
    } catch (error) {
      throw new Error(`Failed to get notification by ID: ${error.message}`);
    }
  },

  // Update notification
  updateNotification: async (id, updateData) => {
    try {
      // Validate fields if being updated
      if (updateData.targetRole) {
        const validTargetRoles = ["Student", "Parent", "Teacher", "All"];
        if (!validTargetRoles.includes(updateData.targetRole)) {
          throw new Error("Invalid targetRole");
        }
      }

      if (updateData.type) {
        const validTypes = [
          "General",
          "ClassAbsence",
          "PaymentReminder",
          "System",
          "Event",
        ];
        if (!validTypes.includes(updateData.type)) {
          throw new Error("Invalid notification type");
        }
      }

      if (updateData.method) {
        const validMethods = ["web", "email", "both"];
        if (!validMethods.includes(updateData.method)) {
          throw new Error("Invalid notification method");
        }
      }

      const notification = await Notification.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate("createdBy", "fullName email role")
        .populate("classId", "className grade");

      if (!notification) {
        throw new Error("Notification not found");
      }

      return notification;
    } catch (error) {
      throw new Error(`Failed to update notification: ${error.message}`);
    }
  },

  // Delete notification
  deleteNotification: async (id) => {
    try {
      const notification = await Notification.findByIdAndDelete(id);

      if (!notification) {
        throw new Error("Notification not found");
      }

      return notification;
    } catch (error) {
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  },

  // Send notification via email (placeholder - implement with actual email service)
  sendNotificationEmail: async (id) => {
    try {
      const notification = await Notification.findById(id)
        .populate("createdBy", "fullName email")
        .populate("classId", "className grade students");

      if (!notification) {
        throw new Error("Notification not found");
      }

      if (notification.method !== "email" && notification.method !== "both") {
        throw new Error("Notification method does not include email");
      }

      // TODO: Implement actual email sending logic here
      // This would integrate with your email service (SendGrid, AWS SES, etc.)

      console.log(
        "Email sending would be implemented here for notification:",
        notification._id
      );

      return {
        success: true,
        message: "Email notification sent successfully",
        notificationId: notification._id,
      };
    } catch (error) {
      throw new Error(`Failed to send notification email: ${error.message}`);
    }
  },

  // Get notification statistics
  getNotificationStatistics: async () => {
    try {
      const [
        totalNotifications,
        activeNotifications,
        notificationsByType,
        notificationsByTargetRole,
        notificationsByMethod,
        recentNotifications,
      ] = await Promise.all([
        Notification.countDocuments(),
        Notification.countDocuments({ isActive: true }),
        Notification.aggregate([
          { $group: { _id: "$type", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Notification.aggregate([
          { $group: { _id: "$targetRole", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Notification.aggregate([
          { $group: { _id: "$method", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Notification.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
      ]);

      return {
        total: totalNotifications,
        active: activeNotifications,
        byType: notificationsByType,
        byTargetRole: notificationsByTargetRole,
        byMethod: notificationsByMethod,
        recentCount: recentNotifications,
      };
    } catch (error) {
      throw new Error(
        `Failed to get notification statistics: ${error.message}`
      );
    }
  },

  // Toggle notification status
  toggleNotificationStatus: async (id) => {
    try {
      const notification = await Notification.findById(id);

      if (!notification) {
        throw new Error("Notification not found");
      }

      notification.isActive = !notification.isActive;
      await notification.save();

      return notification;
    } catch (error) {
      throw new Error(`Failed to toggle notification status: ${error.message}`);
    }
  },
};

module.exports = notificationService;
