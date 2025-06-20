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

// Compound index để tránh duplicate và optimize query
attendanceSchema.index({ classId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ classId: 1, lessonNumber: 1, date: 1 }); // Non-unique index for queries
attendanceSchema.index({ "students.studentId": 1 });
const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;
