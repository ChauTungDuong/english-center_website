const cron = require("node-cron");
const notificationService = require("../services/role_services/notificationService");

// Cron job để xử lý auto notifications
class NotificationScheduler {
  constructor() {
    this.jobs = [];
  }

  // Start all scheduled jobs
  // Get status of all cron jobs
  getStatus() {
    return this.jobs.map((job, index) => {
      const options = job.options || {};
      return {
        name: options.name || `job-${index}`,
        running: job.running || false,
        scheduled: job.scheduled || false,
        timezone: options.timezone || "UTC",
        expression: job.cronExpression || "unknown",
      };
    });
  }

  // Start all scheduled jobs
  start() {
    console.log("🕐 Starting notification scheduler...");

    // Chạy mỗi giờ để kiểm tra auto notifications và gửi hourly notifications
    const hourlyJob = cron.schedule(
      "0 * * * *",
      async () => {
        console.log("⏰ Checking for scheduled notifications...");
        try {
          await this.processScheduledNotifications();
          await this.processHourlyNotifications();
        } catch (error) {
          console.error("Error processing scheduled notifications:", error);
        }
      },
      {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh",
        name: "hourly-notification-check",
      }
    );

    // Chạy hàng ngày lúc 8:00 AM để gửi daily notifications
    const dailyJob = cron.schedule(
      "40 13 * * *",
      async () => {
        console.log("📅 Processing daily auto notifications...");
        try {
          await this.processDailyNotifications();
        } catch (error) {
          console.error("Error processing daily notifications:", error);
        }
      },
      {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh",
        name: "daily-notifications",
      }
    );

    // Chạy ngày đầu mỗi tháng lúc 8:00 AM để gửi monthly notifications
    const monthlyJob = cron.schedule(
      "0 8 1 * *",
      async () => {
        console.log("📆 Processing monthly auto notifications...");
        try {
          await this.processMonthlyNotifications();
        } catch (error) {
          console.error("Error processing monthly notifications:", error);
        }
      },
      {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh",
        name: "monthly-notifications",
      }
    );

    this.jobs = [hourlyJob, dailyJob, monthlyJob];

    // Start all jobs
    this.jobs.forEach((job) => job.start());
    console.log("✅ Notification scheduler started successfully");
  }

  // Stop all scheduled jobs
  stop() {
    console.log("🛑 Stopping notification scheduler...");
    this.jobs.forEach((job) => job.destroy());
    this.jobs = [];
    console.log("✅ Notification scheduler stopped");
  }

  // Process all scheduled notifications
  async processScheduledNotifications() {
    try {
      const now = new Date();
      const AutoNotificationSetting = require("../models/AutoNotificationSetting");

      // Find settings that need to be executed
      const settingsToExecute = await AutoNotificationSetting.find({
        isActive: true,
        nextExecution: { $lte: now },
      }).populate("classId");

      if (settingsToExecute.length === 0) {
        console.log("ℹ️ No scheduled notifications to process");
        return;
      }

      console.log(
        `📬 Processing ${settingsToExecute.length} scheduled notifications`
      );

      for (const setting of settingsToExecute) {
        try {
          await this.executeSingleNotification(setting);
          await setting.updateNextExecution();
          console.log(
            `✅ Processed notification for class: ${setting.classId.className}`
          );
        } catch (error) {
          console.error(
            `❌ Error processing notification for class ${setting.classId.className}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error in processScheduledNotifications:", error);
      throw error;
    }
  }

  // Process daily notifications
  async processDailyNotifications() {
    try {
      const AutoNotificationSetting = require("../models/AutoNotificationSetting");

      const dailySettings = await AutoNotificationSetting.find({
        isActive: true,
        scheduleType: "daily",
      }).populate("classId");

      console.log(
        `📋 Found ${dailySettings.length} daily notification settings`
      );

      for (const setting of dailySettings) {
        try {
          await this.executeSingleNotification(setting);
          await setting.updateNextExecution();
          console.log(
            `✅ Sent daily notification for class: ${setting.classId.className}`
          );
        } catch (error) {
          console.error(
            `❌ Error sending daily notification for class ${setting.classId.className}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error in processDailyNotifications:", error);
      throw error;
    }
  }

  // Process monthly notifications
  async processMonthlyNotifications() {
    try {
      const AutoNotificationSetting = require("../models/AutoNotificationSetting");

      const monthlySettings = await AutoNotificationSetting.find({
        isActive: true,
        scheduleType: "monthly",
      }).populate("classId");

      console.log(
        `📋 Found ${monthlySettings.length} monthly notification settings`
      );

      for (const setting of monthlySettings) {
        try {
          await this.executeSingleNotification(setting);
          await setting.updateNextExecution();
          console.log(
            `✅ Sent monthly notification for class: ${setting.classId.className}`
          );
        } catch (error) {
          console.error(
            `❌ Error sending monthly notification for class ${setting.classId.className}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error in processMonthlyNotifications:", error);
      throw error;
    }
  }

  // Process hourly notifications
  async processHourlyNotifications() {
    try {
      const AutoNotificationSetting = require("../models/AutoNotificationSetting");

      const hourlySettings = await AutoNotificationSetting.find({
        isActive: true,
        scheduleType: "hourly",
      }).populate("classId");

      console.log(
        `📋 Found ${hourlySettings.length} hourly notification settings`
      );

      for (const setting of hourlySettings) {
        try {
          await this.executeSingleNotification(setting);
          await setting.updateNextExecution();
          console.log(
            `✅ Sent hourly notification for class: ${setting.classId.className}`
          );
        } catch (error) {
          console.error(
            `❌ Error sending hourly notification for class ${setting.classId.className}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error in processHourlyNotifications:", error);
      throw error;
    }
  }

  // Execute a single notification setting
  async executeSingleNotification(setting) {
    try {
      const classId = setting.classId._id;
      const className = setting.classId.className;

      // Create notification data with placeholder content
      // Content will be personalized in sendPersonalizedParentNotifications
      const notificationData = {
        title: `Báo cáo ${
          setting.scheduleType === "hourly"
            ? "theo giờ"
            : setting.scheduleType === "daily"
            ? "hàng ngày"
            : "hàng tháng"
        } - Lớp ${className}`,
        content: "Thông báo cá nhân sẽ được tạo cho từng phụ huynh", // Placeholder content
        targetRole: "Parent",
        type: "PaymentReminder",
        method: "email",
        classId,
        createdBy: setting.createdBy,
        createdByRole: "Admin",
        scheduleType: setting.scheduleType,
        isActive: true,
      };

      // Send notification - this will trigger sendPersonalizedParentNotifications
      await notificationService.createAndSendNotification(notificationData);
    } catch (error) {
      console.error("Error executing single notification:", error);
      throw error;
    }
  }

  // Get status of all cron jobs
  getStatus() {
    return this.jobs.map((job, index) => {
      const options = job.options || {};
      return {
        name: options.name || `job-${index}`,
        running: job.running || false,
        scheduled: job.scheduled || false,
        timezone: options.timezone || "UTC",
        expression: job.cronExpression || "unknown",
      };
    });
  }

  // Manual trigger for testing
  async triggerManualExecution(settingId) {
    try {
      const AutoNotificationSetting = require("../models/AutoNotificationSetting");
      const setting = await AutoNotificationSetting.findById(
        settingId
      ).populate("classId");

      if (!setting) {
        throw new Error("Auto notification setting not found");
      }

      if (!setting.isActive) {
        throw new Error("Auto notification setting is not active");
      }

      await this.executeSingleNotification(setting);
      console.log(
        `✅ Manual execution completed for class: ${setting.classId.className}`
      );

      return {
        success: true,
        message: `Manual notification sent for class: ${setting.classId.className}`,
      };
    } catch (error) {
      console.error("Error in manual trigger:", error);
      throw error;
    }
  }
}

// Create singleton instance
const notificationScheduler = new NotificationScheduler();

module.exports = notificationScheduler;
