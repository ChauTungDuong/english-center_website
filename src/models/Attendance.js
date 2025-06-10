const mongoose = require("mongoose");
const attendanceSchema = new mongoose.Schema(
  {
    date: Date,
    classId: { type: mongoose.Schema.ObjectId, ref: "Class" },
    attendance: [
      {
        studentId: { type: mongoose.Schema.ObjectId, ref: "Student" },
        isAbsent: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);
const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;
