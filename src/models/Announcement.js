const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ["ClassPromotion", "General", "Event"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    targetAudience: {
      type: String,
      enum: ["All", "Parents", "Students", "Teachers"],
      default: "All",
    },
    relatedClassId: { type: mongoose.Schema.ObjectId, ref: "Class" },
    image: { type: String },
  },
  { timestamps: true }
);

const Announcement = mongoose.model("Announcement", announcementSchema);
module.exports = Announcement;
