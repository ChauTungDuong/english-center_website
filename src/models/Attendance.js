// models/Attendance.js
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.ObjectId, ref: "Class", required: true },
    date: { type: Date, required: true },
    lessonNumber: { type: Number, required: true },
    students: [
      {
        studentId: {
          type: mongoose.Schema.ObjectId,
          ref: "Student",
          required: true,
        },
        isAbsent: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for better query performance
attendanceSchema.index({ classId: 1, date: 1 }, { unique: true }); // Prevent duplicate attendance for same class/date
attendanceSchema.index({ classId: 1, date: -1 }); // Query attendance by class, sorted by date
attendanceSchema.index({ classId: 1, lessonNumber: 1 }); // Query by class and lesson number
attendanceSchema.index({ "students.studentId": 1 }); // Query attendance by student
attendanceSchema.index({ date: -1 }); // Sort by date descending
attendanceSchema.index({ createdAt: -1 }); // Sort by creation date

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;
