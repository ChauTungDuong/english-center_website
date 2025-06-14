const mongoose = require("mongoose");
const attendanceSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.ObjectId, ref: "Class", required: true },
    records: [
      {
        date: { type: Date, required: true },
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
