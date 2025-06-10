const mongoose = require("mongoose");
const parentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    childId: { type: mongoose.Schema.ObjectId, ref: "Student" },
    canSeeTeacher: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const Parent = mongoose.model("Parent", parentSchema);
module.exports = Parent;
