const mongoose = require("mongoose");
const teacherSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    classId: [{ type: mongoose.Schema.ObjectId, ref: "Class" }],
    wagePerLesson: { type: Number, default: 0 },
  },
  { timestamps: true }
);
const Teacher = mongoose.model("Teacher", teacherSchema);
module.exports = Teacher;
