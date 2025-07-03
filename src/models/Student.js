const mongoose = require("mongoose");
const studentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    classId: {
      type: [{ type: mongoose.Schema.ObjectId, ref: "Class" }],
      default: [],
      required: true,
    },
    parentId: { type: mongoose.Schema.ObjectId, ref: "Parent" },
  },
  {
    timestamps: true,
    minimize: false,
  }
);
const Student = mongoose.model("Student", studentSchema);
module.exports = Student;
