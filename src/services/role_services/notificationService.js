const {
  Notification,
  Class,
  User,
  Student,
  Teacher,
  Parent,
  AutoNotificationSetting,
} = require("../../models");
const emailService = require("../emailService");

const notificationService = {
  async checkTeacherClassPermission(teacherId, classId) {
    try {
      const teacher = await Teacher.findOne({
        userId: teacherId,
        classId: { $in: [classId] },
      });
      return !!teacher;
    } catch (error) {
      throw new Error(`Failed to check teacher permission: ${error.message}`);
    }
  },

  async createAndSendNotification(notificationData) {
    try {
      // Validate required fields
      const {
        title,
        content,
        targetRole,
        type,
        method,
        createdBy,
        createdByRole,
      } = notificationData;

      if (
        !title ||
        !content ||
        !targetRole ||
        !type ||
        !method ||
        !createdBy ||
        !createdByRole
      ) {
        throw new Error("All required fields must be provided");
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

      // Validate method
      const validMethods = ["web", "email", "both"];
      if (!validMethods.includes(method)) {
        throw new Error("Invalid notification method");
      }

      // If classId is provided, validate it exists
      if (notificationData.classId) {
        const classExists = await Class.findById(notificationData.classId);
        if (!classExists) {
          throw new Error("Class not found");
        }
      }

      // Create notification in database
      const notification = new Notification(notificationData);
      await notification.save();

      // Send notification based on method
      if (method === "email" || method === "both") {
        await notificationService.sendEmailNotification(notification);
      }

      // Populate references for response
      await notification.populate("createdBy", "fullName email role");
      if (notification.classId) {
        await notification.populate("classId", "className grade");
      }

      return notification;
    } catch (error) {
      throw new Error(
        `Failed to create and send notification: ${error.message}`
      );
    }
  },

  async sendEmailNotification(notification) {
    try {
      // For Parent role, send personalized notifications
      if (notification.targetRole === "Parent") {
        return await notificationService.sendPersonalizedParentNotifications(
          notification
        );
      }

      // For other roles, use the original logic
      const recipients = await notificationService.getNotificationRecipients(
        notification.targetRole,
        notification.classId
      );

      // Send emails with timeout protection
      const emailPromises = recipients.slice(0, 50).map(async (recipient) => {
        if (recipient.email) {
          try {
            // Use the beautiful notification email template
            return await Promise.race([
              emailService.sendNotificationEmail({
                to: recipient.email,
                subject: notification.title,
                content: notification.content,
                recipientName: recipient.fullName || recipient.name || "Bạn",
              }),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Email timeout")), 10000)
              ),
            ]);
          } catch (error) {
            console.warn(
              `Failed to send email to ${recipient.email}:`,
              error.message
            );
            return null;
          }
        }
      });

      const results = await Promise.allSettled(emailPromises);
      const successful = results.filter(
        (r) => r.status === "fulfilled" && r.value
      ).length;

      return {
        success: true,
        recipientCount: recipients.length,
        successfulSends: successful,
        message: `Sent ${successful}/${recipients.length} emails successfully`,
      };
    } catch (error) {
      console.error("Error in sendEmailNotification:", error);
      throw new Error(`Failed to send email notification: ${error.message}`);
    }
  },

  // Send personalized notifications to parents about their own children
  async sendPersonalizedParentNotifications(notification) {
    try {
      let studentsWithParents = [];

      if (notification.classId) {
        // Get students and their parents for specific class
        const classData = await Class.findById(notification.classId).populate({
          path: "studentList",
          populate: [
            { path: "userId", select: "name email" },
            {
              path: "parentId",
              populate: { path: "userId", select: "email fullName name" },
            },
          ],
        });

        studentsWithParents = classData.studentList.filter(
          (student) => student.parentId?.userId?.email
        );
      } else {
        // Get all students with their parents
        const students = await Student.find().populate([
          { path: "userId", select: "name email" },
          {
            path: "parentId",
            populate: { path: "userId", select: "email fullName name" },
          },
          { path: "classId", select: "className" },
        ]);

        studentsWithParents = students.filter(
          (student) => student.parentId?.userId?.email
        );
      }

      console.log(
        `Found ${studentsWithParents.length} students with parent emails`
      );

      // Send personalized email to each parent
      const emailPromises = studentsWithParents.map(async (student) => {
        try {
          // Get student data for this specific student
          const studentData = await notificationService.getStudentDataForParent(
            student._id
          );

          // Generate personalized content for this parent
          const personalizedContent =
            notificationService.generateParentNotificationContent(studentData);

          const parentUser = student.parentId.userId;
          const parentName =
            parentUser.fullName || parentUser.name || "Phụ huynh";

          // Send personalized email
          return await Promise.race([
            emailService.sendNotificationEmail({
              to: parentUser.email,
              subject: `Thông báo về con ${studentData.studentName}`,
              content: personalizedContent,
              recipientName: parentName,
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Email timeout")), 10000)
            ),
          ]);
        } catch (error) {
          console.warn(
            `Failed to send personalized email for student ${student.userId?.name}:`,
            error.message
          );
          return null;
        }
      });

      const results = await Promise.allSettled(emailPromises);
      const successful = results.filter(
        (r) => r.status === "fulfilled" && r.value
      ).length;

      return {
        success: true,
        recipientCount: studentsWithParents.length,
        successfulSends: successful,
        message: `Sent ${successful}/${studentsWithParents.length} personalized emails to parents`,
      };
    } catch (error) {
      throw new Error(
        `Failed to send personalized parent notifications: ${error.message}`
      );
    }
  },

  // Get recipients from a specific class
  getClassRecipients: async (classId, targetRole) => {
    try {
      let recipients = [];

      if (targetRole === "Student" || targetRole === "All") {
        const students = await Student.find({ classId }).populate(
          "userId",
          "fullName email"
        );
        recipients.push(...students.map((s) => s.userId));
      }

      if (targetRole === "Parent" || targetRole === "All") {
        const students = await Student.find({ classId }).populate(
          "parentId",
          "fullName email"
        );
        recipients.push(...students.map((s) => s.parentId).filter((p) => p));
      }

      if (targetRole === "Teacher" || targetRole === "All") {
        const teachers = await Teacher.find({
          classId: { $in: [classId] },
        }).populate("userId", "fullName email");
        recipients.push(...teachers.map((t) => t.userId));
      }

      return recipients.filter((r) => r && r.email);
    } catch (error) {
      throw new Error(`Failed to get class recipients: ${error.message}`);
    }
  },

  // Get all recipients of a specific role
  getAllRecipients: async (targetRole) => {
    try {
      let recipients = [];

      if (targetRole === "All") {
        recipients = await User.find({ isActive: true }, "fullName email");
      } else {
        recipients = await User.find(
          { role: targetRole, isActive: true },
          "fullName email"
        );
      }

      return recipients;
    } catch (error) {
      throw new Error(`Failed to get all recipients: ${error.message}`);
    }
  },

  // Setup auto notifications for attendance and payment
  setupAutoNotifications: async (settingData) => {
    try {
      const { classId, scheduleType, createdBy, isActive } = settingData;

      // Check if setting already exists for this class and schedule type
      const existingSetting = await AutoNotificationSetting.findOne({
        classId,
        scheduleType,
      });
      if (existingSetting) {
        throw new Error(
          `Auto notification setting already exists for this class with ${scheduleType} schedule`
        );
      }

      const autoSetting = new AutoNotificationSetting({
        classId,
        scheduleType, // 'hourly', 'daily' or 'monthly'
        isActive,
        createdBy,
      });

      await autoSetting.save();
      await autoSetting.populate("classId", "className grade");

      return autoSetting;
    } catch (error) {
      throw new Error(`Failed to setup auto notifications: ${error.message}`);
    }
  },

  // Get auto notification settings
  getAutoNotificationSettings: async () => {
    try {
      const settings = await AutoNotificationSetting.find()
        .populate("classId", "className grade")
        .populate("createdBy", "fullName email")
        .sort({ createdAt: -1 });

      return settings;
    } catch (error) {
      throw new Error(
        `Failed to get auto notification settings: ${error.message}`
      );
    }
  },

  // Update auto notification settings
  updateAutoNotificationSettings: async (settingId, updateData) => {
    try {
      const updatedSetting = await AutoNotificationSetting.findByIdAndUpdate(
        settingId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate("classId", "className grade");

      return updatedSetting;
    } catch (error) {
      throw new Error(
        `Failed to update auto notification settings: ${error.message}`
      );
    }
  },

  // Process auto notifications (to be called by cron job)
  processAutoNotifications: async () => {
    try {
      const activeSettings = await AutoNotificationSetting.find({
        isActive: true,
      }).populate("classId");

      for (const setting of activeSettings) {
        const classId = setting.classId._id;
        const className = setting.classId.className;

        // Send personalized notification to parents about their children
        const notificationData = {
          title: `Báo cáo ${
            setting.scheduleType === "hourly"
              ? "theo giờ"
              : setting.scheduleType === "daily"
              ? "hàng ngày"
              : "hàng tháng"
          } - Lớp ${className}`,
          content: "", // Content will be generated individually for each parent
          targetRole: "Parent",
          type: "PaymentReminder",
          method: "email",
          classId,
          createdBy: setting.createdBy,
          createdByRole: "Admin",
          scheduleType: setting.scheduleType,
          isActive: true,
        };

        await notificationService.createAndSendNotification(notificationData);
      }
    } catch (error) {
      throw new Error(`Failed to process auto notifications: ${error.message}`);
    }
  },

  // Get class attendance data (mock implementation - needs actual attendance model)
  // Get individual student data for parent notifications
  getStudentDataForParent: async (studentId) => {
    try {
      const { Student, Class, Attendance, Payment } = require("../../models");

      // Get student info with class
      const student = await Student.findById(studentId)
        .populate("userId", "name")
        .populate("classId", "className");

      if (!student) {
        throw new Error("Student not found");
      }

      // For now using mock data, but these should query actual Attendance and Payment models
      const totalSessions = 20; // Total sessions in course
      const attendedSessions = 15; // Sessions attended
      const absentSessions = totalSessions - attendedSessions;
      const unpaidAmount = 500000; // Amount unpaid in VND

      return {
        studentName: student.userId.name,
        className:
          student.classId.length > 0
            ? student.classId[0].className
            : "Chưa có lớp",
        totalSessions,
        attendedSessions,
        absentSessions,
        unpaidAmount,
      };
    } catch (error) {
      throw new Error(`Error getting student data: ${error.message}`);
    }
  },

  // Generate simple notification content for parent
  generateParentNotificationContent: (studentData) => {
    const content = `Tên con: ${studentData.studentName}, Lớp: ${
      studentData.className
    }, Số buổi học: ${studentData.attendedSessions}, Số buổi vắng: ${
      studentData.absentSessions
    }, Số tiền chưa đóng: ${studentData.unpaidAmount.toLocaleString(
      "vi-VN"
    )} VNĐ`;

    return content;
  },

  // Get class attendance data (keeping for backward compatibility)
  getClassAttendanceData: async (classId) => {
    // This would need to integrate with your attendance system
    // For now, returning mock data
    return {
      totalStudents: 25,
      absentStudents: 3,
      absenteeDetails: [
        { studentName: "Nguyễn Văn A", absentDays: 5 },
        { studentName: "Trần Thị B", absentDays: 3 },
        { studentName: "Lê Văn C", absentDays: 2 },
      ],
    };
  },

  // Get class payment data (mock implementation - needs actual payment model)
  getClassPaymentData: async (classId) => {
    // This would need to integrate with your payment system
    // For now, returning mock data
    return {
      totalStudents: 25,
      unpaidStudents: 2,
      unpaidDetails: [
        { studentName: "Nguyễn Văn A", unpaidAmount: 500000 },
        { studentName: "Trần Thị B", unpaidAmount: 300000 },
      ],
    };
  },

  // Generate auto notification content
  generateAutoNotificationContent: (className, attendanceData, paymentData) => {
    let content = `Báo cáo lớp ${className}\n\n`;

    content += `📊 THỐNG KÊ VẮNG MẶT:\n`;
    content += `- Tổng số học sinh: ${attendanceData.totalStudents}\n`;
    content += `- Số học sinh vắng mặt: ${attendanceData.absentStudents}\n\n`;

    if (attendanceData.absenteeDetails.length > 0) {
      content += `Chi tiết học sinh vắng mặt:\n`;
      attendanceData.absenteeDetails.forEach((student) => {
        content += `• ${student.studentName}: ${student.absentDays} buổi\n`;
      });
      content += `\n`;
    }

    content += `💰 THỐNG KÊ THANH TOÁN:\n`;
    content += `- Tổng số học sinh: ${paymentData.totalStudents}\n`;
    content += `- Số học sinh chưa đóng tiền: ${paymentData.unpaidStudents}\n\n`;

    if (paymentData.unpaidDetails.length > 0) {
      content += `Chi tiết học sinh chưa đóng tiền:\n`;
      paymentData.unpaidDetails.forEach((student) => {
        content += `• ${
          student.studentName
        }: ${student.unpaidAmount.toLocaleString("vi-VN")} VNĐ\n`;
      });
    }

    content += `\nVui lòng liên hệ với trung tâm để được hỗ trợ thêm thông tin.`;

    return content;
  },

  // Get all notifications with pagination and filters
  getAllNotifications: async (options = {}) => {
    try {
      const { page = 1, limit = 10, filters = {} } = options;

      // Ensure page and limit are valid numbers
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10)); // Max 100 items per page
      const skip = (pageNum - 1) * limitNum;

      const [notifications, total] = await Promise.all([
        Notification.find(filters)
          .populate("createdBy", "fullName email role")
          .populate("classId", "className grade")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Notification.countDocuments(filters),
      ]);

      return {
        notifications,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          limit: limitNum,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get notifications: ${error.message}`);
    }
  },

  // Get notifications for specific role
  getNotificationsForRole: async (options = {}) => {
    try {
      const { userId, role, page = 1, limit = 10, type } = options;

      // Build base filters
      let baseFilters = {
        isActive: true,
      };

      if (type && type !== "") {
        baseFilters.type = type;
      }

      // Build role-based filter conditions
      let roleConditions = [
        { targetRole: "All" }, // Always include notifications for "All"
      ];

      // Add specific role condition
      if (role !== "All") {
        roleConditions.push({ targetRole: role });
      }

      // Handle class-specific filtering for Students and Parents
      if (role === "Student") {
        const student = await Student.findOne({ userId }).populate("classId");
        if (student && student.classId) {
          // Student can see:
          // 1. Notifications for "All" roles (regardless of class)
          // 2. Notifications for "Student" role (regardless of class)
          // 3. Notifications specifically for their class (any target role)
          // 4. Notifications with no specific class (general notifications)
          roleConditions = [
            { targetRole: "All" },
            { targetRole: "Student" },
            { $and: [{ classId: student.classId._id }] },
            {
              $and: [
                { classId: null },
                { targetRole: { $in: ["Student", "All"] } },
              ],
            },
          ];
        }
      } else if (role === "Parent") {
        const student = await Student.findOne({ parentId: userId }).populate(
          "classId"
        );
        if (student && student.classId) {
          // Parent can see:
          // 1. Notifications for "All" roles (regardless of class)
          // 2. Notifications for "Parent" role (regardless of class)
          // 3. Notifications specifically for their child's class (any target role)
          // 4. Notifications with no specific class (general notifications)
          roleConditions = [
            { targetRole: "All" },
            { targetRole: "Parent" },
            { $and: [{ classId: student.classId._id }] },
            {
              $and: [
                { classId: null },
                { targetRole: { $in: ["Parent", "All"] } },
              ],
            },
          ];
        }
      } else if (role === "Teacher") {
        // Teachers can see:
        // 1. Notifications for "All" roles
        // 2. Notifications for "Teacher" role
        // 3. Notifications for classes they teach
        const teacher = await Teacher.findOne({ userId });
        if (teacher && teacher.classId && teacher.classId.length > 0) {
          roleConditions = [
            { targetRole: "All" },
            { targetRole: "Teacher" },
            { classId: { $in: teacher.classId } },
            {
              $and: [
                { classId: null },
                { targetRole: { $in: ["Teacher", "All"] } },
              ],
            },
          ];
        }
      }

      // Combine base filters with role conditions
      const filters = {
        ...baseFilters,
        $or: roleConditions,
      };

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find(filters)
          .populate("createdBy", "fullName email role")
          .populate("classId", "className grade")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments(filters),
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

  // Get notification by ID with permission check
  getNotificationById: async (id, userId = null, userRole = null) => {
    try {
      const notification = await Notification.findById(id)
        .populate("createdBy", "fullName email role")
        .populate("classId", "className grade");

      if (!notification) {
        return null;
      }

      // If userId and userRole provided, check permissions
      if (userId && userRole) {
        // Admin can see all notifications
        if (userRole === "Admin") {
          return notification;
        }

        // Creator can see their own notifications
        if (notification.createdBy._id.toString() === userId) {
          return notification;
        }

        // Check if user has permission to see this notification based on role and class
        const hasPermission =
          await notificationService.checkNotificationPermission(
            notification,
            userId,
            userRole
          );

        if (!hasPermission) {
          return null;
        }
      }

      return notification;
    } catch (error) {
      throw new Error(`Failed to get notification by ID: ${error.message}`);
    }
  },

  // Check if user has permission to view notification
  checkNotificationPermission: async (notification, userId, userRole) => {
    try {
      // If notification targets "All", everyone can see it
      if (notification.targetRole === "All") {
        return true;
      }

      // Check if notification targets user's role
      if (notification.targetRole !== userRole) {
        return false;
      }

      // If no specific class, user can see it (general notification for their role)
      if (!notification.classId) {
        return true;
      }

      // Check class-specific permissions
      if (userRole === "Teacher") {
        const teacher = await Teacher.findOne({
          userId,
          classId: { $in: [notification.classId] },
        });
        return !!teacher;
      }

      if (userRole === "Student") {
        const student = await Student.findOne({
          userId,
          classId: notification.classId,
        });
        return !!student;
      }

      if (userRole === "Parent") {
        const student = await Student.findOne({
          parentId: userId,
          classId: notification.classId,
        });
        return !!student;
      }

      return false;
    } catch (error) {
      throw new Error(
        `Failed to check notification permission: ${error.message}`
      );
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

  async getNotificationRecipients(targetRole, classId = null) {
    try {
      let recipients = [];

      if (targetRole === "All") {
        // Get all users
        const users = await User.find({ isActive: true }).select(
          "email fullName"
        );
        recipients = users;
      } else if (targetRole === "Student") {
        if (classId) {
          // Get students in specific class
          const classData = await Class.findById(classId).populate({
            path: "studentList",
            populate: { path: "userId", select: "email fullName" },
          });
          recipients = classData.studentList
            .map((student) => student.userId)
            .filter((user) => user && user.email);
        } else {
          // Get all students
          const students = await Student.find().populate(
            "userId",
            "email fullName"
          );
          recipients = students
            .map((student) => student.userId)
            .filter((user) => user && user.email);
        }
      } else if (targetRole === "Parent") {
        if (classId) {
          // Get parents of students in specific class
          const classData = await Class.findById(classId).populate({
            path: "studentList",
            populate: {
              path: "parentId",
              populate: { path: "userId", select: "email fullName" },
            },
          });
          recipients = classData.studentList
            .map((student) => student.parentId?.userId)
            .filter((user) => user && user.email);
        } else {
          // Get all parents
          const parents = await Parent.find().populate(
            "userId",
            "email fullName"
          );
          recipients = parents
            .map((parent) => parent.userId)
            .filter((user) => user && user.email);
        }
      } else if (targetRole === "Teacher") {
        if (classId) {
          // Get teacher of specific class
          const classData = await Class.findById(classId).populate({
            path: "teacherId",
            populate: { path: "userId", select: "email fullName" },
          });
          if (classData.teacherId?.userId?.email) {
            recipients = [classData.teacherId.userId];
          }
        } else {
          // Get all teachers
          const teachers = await Teacher.find().populate(
            "userId",
            "email fullName"
          );
          recipients = teachers
            .map((teacher) => teacher.userId)
            .filter((user) => user && user.email);
        }
      }

      return recipients;
    } catch (error) {
      throw new Error(
        `Failed to get notification recipients: ${error.message}`
      );
    }
  },
};

module.exports = notificationService;
