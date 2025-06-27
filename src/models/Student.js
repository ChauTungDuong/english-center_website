const mongoose = require("mongoose");
const studentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    classId: {
      type: [{ type: mongoose.Schema.ObjectId, ref: "Class" }],
      default: [], // Đảm bảo mặc định là array rỗng
    },
    parentId: { type: mongoose.Schema.ObjectId, ref: "Parent" },
  },
  { timestamps: true }
);
const Student = mongoose.model("Student", studentSchema);
module.exports = Student;
