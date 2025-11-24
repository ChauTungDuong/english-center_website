const mongoose = require("mongoose");
const studentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    classId: {
      type: [{ type: mongoose.Schema.ObjectId, ref: "Class" }],
      default: [],
      required: true,
    },
    parentId: { type: mongoose.Schema.ObjectId, ref: "Parent" },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

// Indexes for better query performance
studentSchema.index({ userId: 1 }, { unique: true }); // One student per user
studentSchema.index({ parentId: 1 }); // Query students by parent
studentSchema.index({ classId: 1 }); // Query students by class
studentSchema.index({ createdAt: -1 }); // Sort by creation date

const Student = mongoose.model("Student", studentSchema);
module.exports = Student;
