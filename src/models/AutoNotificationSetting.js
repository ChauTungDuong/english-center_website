const mongoose = require("mongoose");

const autoNotificationSettingSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    scheduleType: {
      type: String,
      enum: ["hourly", "daily", "monthly"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastExecuted: {
      type: Date,
      default: null,
    },
    nextExecution: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: One setting per class per schedule type
autoNotificationSettingSchema.index(
  { classId: 1, scheduleType: 1 },
  { unique: true }
);

// Index for efficient queries
autoNotificationSettingSchema.index({ isActive: 1 });
autoNotificationSettingSchema.index({ scheduleType: 1 });

// Pre-save middleware to calculate next execution time
autoNotificationSettingSchema.pre("save", function (next) {
  if (this.isModified("scheduleType") || this.isNew) {
    const now = new Date();

    if (this.scheduleType === "hourly") {
      // Set next execution to next hour
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1);
      nextHour.setMinutes(0, 0, 0);
      this.nextExecution = nextHour;
    } else if (this.scheduleType === "daily") {
      // Set next execution to tomorrow at 8 AM
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);
      this.nextExecution = tomorrow;
    } else if (this.scheduleType === "monthly") {
      // Set next execution to first day of next month at 8 AM
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(8, 0, 0, 0);
      this.nextExecution = nextMonth;
    }
  }
  next();
});

// Method to update next execution time after processing
autoNotificationSettingSchema.methods.updateNextExecution = function () {
  const now = new Date();
  this.lastExecuted = now;

  if (this.scheduleType === "hourly") {
    // Set next execution to next hour
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0, 0, 0);
    this.nextExecution = nextHour;
  } else if (this.scheduleType === "daily") {
    // Set next execution to tomorrow at 8 AM
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    this.nextExecution = tomorrow;
  } else if (this.scheduleType === "monthly") {
    // Set next execution to first day of next month at 8 AM
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(8, 0, 0, 0);
    this.nextExecution = nextMonth;
  }

  return this.save();
};

const AutoNotificationSetting = mongoose.model(
  "AutoNotificationSetting",
  autoNotificationSettingSchema
);

module.exports = AutoNotificationSetting;
