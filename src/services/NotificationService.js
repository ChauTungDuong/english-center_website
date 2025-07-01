const { BaseService } = require("../core/utils");
const { ValidationError, NotFoundError } = require("../core/errors/AppError");
const {
  Notification,
  Class,
  User,
  Student,
  Teacher,
  Parent,
  AutoNotificationSetting,
} = require("../models");
const emailService = require("./emailService");

class NotificationService extends BaseService {
  constructor() {
    super(Notification);
  }

  /**
   * Check if teacher has permission to access a specific class
   */
  async checkTeacherClassPermission(teacherId, classId) {
    try {
      const teacher = await Teacher.findOne({
        userId: teacherId,
        classId: { $in: [classId] },
      });
      return !!teacher;
    } catch (error) {
      throw new ValidationError(
        `Failed to check teacher permission: ${error.message}`
      );
    }
  }

  /**
   * Create and send notification
   */
  async createAndSendNotification(notificationData) {
    const {
      title,
      content,
      targetRole,
      type,
      method,
      createdBy,
      createdByRole,
      classId,
    } = notificationData;

    // Validate required fields (allow empty content for Parent notifications)
    if (
      !title ||
      (!content && targetRole !== "Parent") ||
      !targetRole ||
      !type ||
      !method ||
      !createdBy ||
      !createdByRole
    ) {
      throw new ValidationError("All required fields must be provided");
    }

    // Validate targetRole
    const validTargetRoles = ["Student", "Parent", "Teacher", "All"];
    if (!validTargetRoles.includes(targetRole)) {
      throw new ValidationError("Invalid targetRole");
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
      throw new ValidationError("Invalid notification type");
    }

    // Validate method
    const validMethods = ["web", "email", "both"];
    if (!validMethods.includes(method)) {
      throw new ValidationError("Invalid notification method");
    }

    // If classId is provided, validate it exists
    if (classId) {
      const classExists = await Class.findById(classId);
      if (!classExists) {
        throw new NotFoundError("Class not found");
      }
    }

    // Create notification in database
    const notification = await this.create(notificationData);

    // Send notification based on method
    if (method === "email" || method === "both") {
      await this.sendEmailNotification(notification);
    }

    // Populate references for response
    await notification.populate("createdBy", "fullName email role");
    if (notification.classId) {
      await notification.populate("classId", "className grade");
    }

    return notification;
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(notification) {
    try {
      // For Parent role, send personalized notifications
      if (notification.targetRole === "Parent") {
        return await this.sendPersonalizedParentNotifications(notification);
      }

      // For other roles, use the original logic
      const recipients = await this.getNotificationRecipients(
        notification.targetRole,
        notification.classId
      );

      // Send emails with timeout protection
      const emailPromises = recipients.slice(0, 50).map(async (recipient) => {
        if (recipient.email) {
          try {
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
  }

  /**
   * Send personalized notifications to parents about their own children
   */
  async sendPersonalizedParentNotifications(notification) {
    let studentsWithParents = [];

    if (notification.classId) {
      // Get students and their parents for specific class
      const classData = await Class.findById(notification.classId).populate({
        path: "studentList",
        populate: [
          { path: "userId", select: "name email" },
          { path: "classId", select: "className" },
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
        const studentData = await this.getStudentDataForParent(student._id);

        // Generate personalized content for this parent
        const personalizedContent =
          this.generateParentNotificationContent(studentData);

        const parentUser = student.parentId.userId;
        const parentName =
          parentUser.fullName || parentUser.name || "Phụ huynh";

        // Send personalized email
        return await Promise.race([
          emailService.sendNotificationEmail({
            to: parentUser.email,
            subject: `Trung tâm xin gửi phụ huynh thông tin về học phí và số buổi học của ${studentData.studentName} như sau :`,
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
  }

  /**
   * Get notification recipients based on target role and class
   */
  async getNotificationRecipients(targetRole, classId = null) {
    if (classId) {
      return await this.getClassRecipients(classId, targetRole);
    } else {
      return await this.getAllRecipients(targetRole);
    }
  }

  /**
   * Get recipients from a specific class
   */
  async getClassRecipients(classId, targetRole) {
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
  }

  /**
   * Get all recipients of a specific role
   */
  async getAllRecipients(targetRole) {
    let recipients = [];

    if (targetRole === "All") {
      const users = await User.find(
        {
          role: { $in: ["Student", "Parent", "Teacher"] },
        },
        "fullName email role"
      );
      recipients = users;
    } else if (targetRole === "Student") {
      const students = await Student.find().populate(
        "userId",
        "fullName email"
      );
      recipients = students.map((s) => s.userId).filter((u) => u);
    } else if (targetRole === "Parent") {
      const parents = await Parent.find().populate("userId", "fullName email");
      recipients = parents.map((p) => p.userId).filter((u) => u);
    } else if (targetRole === "Teacher") {
      const teachers = await Teacher.find().populate(
        "userId",
        "fullName email"
      );
      recipients = teachers.map((t) => t.userId).filter((u) => u);
    }

    return recipients.filter((r) => r && r.email);
  }

  /**
   * Get student data for parent notification
   */
  async getStudentDataForParent(studentId) {
    const student = await Student.findById(studentId).populate([
      { path: "userId", select: "name email" },
      { path: "classId", select: "className grade tuitionFee" },
      { path: "parentId", populate: { path: "userId", select: "fullName" } },
    ]);

    if (!student) {
      throw new NotFoundError("Student not found");
    }

    // Get attendance data
    const attendanceData = await this.getStudentAttendanceData(studentId);

    // Get payment data
    const paymentData = await this.getStudentPaymentData(studentId);

    return {
      studentName: student.userId.name,
      className: student.classId?.className || "N/A",
      grade: student.classId?.grade || "N/A",
      tuitionFee: student.classId?.tuitionFee || 0,
      parentName: student.parentId?.userId?.fullName || "Phụ huynh",
      ...attendanceData,
      ...paymentData,
    };
  }

  /**
   * Get student attendance data
   */
  async getStudentAttendanceData(studentId) {
    // This would integrate with AttendanceService
    // For now, return basic data
    return {
      totalSessions: 0,
      attendedSessions: 0,
      absentSessions: 0,
    };
  }

  /**
   * Get student payment data
   */
  async getStudentPaymentData(studentId) {
    // This would integrate with PaymentService
    // For now, return basic data
    return {
      totalOwed: 0,
      totalPaid: 0,
      remainingBalance: 0,
    };
  }

  /**
   * Generate personalized content for parent notifications
   */
  generateParentNotificationContent(studentData) {
    return `
Kính gửi ${studentData.parentName},

Trung tâm xin gửi phụ huynh thông tin về học sinh ${
      studentData.studentName
    } như sau:

📚 THÔNG TIN LỚP HỌC:
- Lớp: ${studentData.className}
- Khối: ${studentData.grade}

📊 THÔNG TIN HỌC TẬP:
- Tổng số buổi học: ${studentData.totalSessions}
- Số buổi đã học: ${studentData.attendedSessions}
- Số buổi vắng: ${studentData.absentSessions}

💰 THÔNG TIN HỌC PHÍ:
- Học phí/tháng: ${studentData.tuitionFee?.toLocaleString() || 0} VNĐ
- Đã đóng: ${studentData.totalPaid?.toLocaleString() || 0} VNĐ
- Còn lại: ${studentData.remainingBalance?.toLocaleString() || 0} VNĐ

Trung tâm cảm ơn sự quan tâm và hợp tác của phụ huynh.

Trân trọng,
Trung tâm Tiếng Anh
    `.trim();
  }

  /**
   * Get all notifications with filtering and pagination
   */
  async getAllNotifications(options = {}) {
    const {
      page = 1,
      limit = 20,
      targetRole,
      type,
      method,
      startDate,
      endDate,
      createdBy,
    } = options;

    const query = {};

    if (targetRole) query.targetRole = targetRole;
    if (type) query.type = type;
    if (method) query.method = method;
    if (createdBy) query.createdBy = createdBy;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    return await this.findWithPagination(query, {
      page,
      limit,
      populate: [
        { path: "createdBy", select: "fullName email role" },
        { path: "classId", select: "className grade" },
      ],
      sort: { createdAt: -1 },
    });
  }

  /**
   * Get notifications for specific role
   */
  async getNotificationsForRole(options = {}) {
    const { targetRole, userId, userRole, page = 1, limit = 20 } = options;

    let query = {};

    if (targetRole) {
      query.targetRole = { $in: [targetRole, "All"] };
    }

    return await this.findWithPagination(query, {
      page,
      limit,
      populate: [
        { path: "createdBy", select: "fullName email role" },
        { path: "classId", select: "className grade" },
      ],
      sort: { createdAt: -1 },
    });
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id, userId = null, userRole = null) {
    const notification = await this.findById(id, {
      populate: [
        { path: "createdBy", select: "fullName email role" },
        { path: "classId", select: "className grade" },
      ],
    });

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    return notification;
  }

  /**
   * Delete notification
   */
  async deleteNotification(id) {
    const notification = await this.findById(id);
    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    return await this.delete(id);
  }
}

module.exports = NotificationService;
