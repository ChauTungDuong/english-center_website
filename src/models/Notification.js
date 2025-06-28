const mongoose = require("mongoose");

// Model cho Notification (thông báo)
const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // Tiêu đề thông báo
    content: { type: String, required: true }, // Nội dung thông báo

    // Đối tượng thông báo (vai trò)
    targetRole: {
      type: String,
      enum: ["Student", "Parent", "Teacher", "All"],
      required: true,
    },

    // Ngày thông báo
    notificationDate: { type: Date, default: Date.now },

    // Loại thông báo
    type: {
      type: String,
      enum: ["General", "ClassAbsence", "PaymentReminder", "System", "Event"],
      required: true,
    },

    // Hình thức thông báo
    method: {
      type: String,
      enum: ["web", "email", "both"],
      required: true,
      default: "web",
    },

    // Thông tin lớp học (nếu gửi trong lớp)
    classId: { type: mongoose.Schema.ObjectId, ref: "Class" },

    createdBy: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    createdByRole: { type: String, enum: ["Teacher", "Admin"], required: true },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for performance
notificationSchema.index({ targetRole: 1, isActive: 1, notificationDate: -1 });
notificationSchema.index({ classId: 1, targetRole: 1 });
notificationSchema.index({ createdBy: 1, createdAt: -1 });
notificationSchema.index({ "readBy.userId": 1 });

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
