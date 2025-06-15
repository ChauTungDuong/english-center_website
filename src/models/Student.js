const mongoose = require("mongoose");
const studentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    classId: [{ type: mongoose.Schema.ObjectId, ref: "Class" }],
    parentId: { type: mongoose.Schema.ObjectId, ref: "Parent" },
  },
  { timestamps: true }
);
const Student = mongoose.model("Student", studentSchema);
module.exports = Student;
