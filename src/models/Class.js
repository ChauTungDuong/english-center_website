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
    attendanceId: { type: mongoose.Schema.ObjectId, ref: "Attendance" },
    schedule: {
      startDate: Date,
      endDate: Date,
      daysOfLessonInWeek: [Number],
    },
  },
  { timestamps: true }
);
const Class = mongoose.model("Class", classSchema);
module.exports = Class;
