const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    password: { type: String, required: true },
    name: String,
    gender: String,
    phoneNumber: String,
    address: String,
    role: {
      type: String,
      enum: ["Admin", "Teacher", "Parent", "Student"],
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes for better query performance
userSchema.index({ email: 1 }, { unique: true }); // Unique email for authentication
userSchema.index({ role: 1, isActive: 1 }); // Query active users by role
userSchema.index({ phoneNumber: 1 }); // Search by phone number
userSchema.index({ createdAt: -1 }); // Sort by creation date

const User = mongoose.model("User", userSchema);
module.exports = User;
