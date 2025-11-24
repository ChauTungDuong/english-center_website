const mongoose = require("mongoose");
const classSchema = new mongoose.Schema(
  {
    className: { type: String, required: true },
    year: { type: Number, required: true },
    grade: { type: Number, required: true },
    isAvailable: { type: Boolean, default: true },
    feePerLesson: Number,
    teacherId: { type: mongoose.Schema.ObjectId, ref: "Teacher" },
    studentList: [{ type: mongoose.Schema.ObjectId, ref: "Student" }],
    // Removed attendanceId - attendance records reference classId instead
    schedule: {
      startDate: Date,
      endDate: Date,
      daysOfLessonInWeek: [Number],
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
classSchema.index({ teacherId: 1, isAvailable: 1 }); // Query available classes by teacher
classSchema.index({ year: -1, grade: 1 }); // Query classes by year and grade
classSchema.index({ isAvailable: 1 }); // Filter available classes
classSchema.index({ className: 1 }); // Search by class name
classSchema.index({ studentList: 1 }); // Query classes by student
classSchema.index({ "schedule.startDate": 1, "schedule.endDate": 1 }); // Query by date range
classSchema.index({ createdAt: -1 }); // Sort by creation date

const Class = mongoose.model("Class", classSchema);
module.exports = Class;
