const mongoose = require("mongoose");
const { generateLessonDates } = require("../utils/schedule");
const attendanceSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.ObjectId, ref: "Class", required: true },
    records: [
      {
        date: { type: Date, required: true },
        lessonNumber: { type: Number, required: true, default: 1 },
        students: [
          {
            studentId: { type: mongoose.Schema.ObjectId, ref: "Student" },
            isAbsent: { type: Boolean, default: false },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);
const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;
