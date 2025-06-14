const mongoose = require("mongoose");
const teacherWageSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.ObjectId,
      ref: "Teacher",
      required: true,
    },
    classId: { type: mongoose.Schema.ObjectId, ref: "Class", required: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const TeacherWage = mongoose.model("TeacherWage", teacherWageSchema);
module.exports = TeacherWage;
