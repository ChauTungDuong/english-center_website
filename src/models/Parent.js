const mongoose = require("mongoose");
const parentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    childId: {
      type: [{ type: mongoose.Schema.ObjectId, ref: "Student" }],
      default: [], // Đảm bảo mặc định là array rỗng, không phải null
    },
    canSeeTeacher: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const Parent = mongoose.model("Parent", parentSchema);
module.exports = Parent;
