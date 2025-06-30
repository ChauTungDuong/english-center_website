const mongoose = require("mongoose");

// Model cho Advertisement (quảng cáo)
const advertisementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // Tiêu đề quảng cáo
    content: { type: String, required: true }, // Nội dung quảng cáo

    // Images stored as Cloudinary objects
    images: [
      {
        url: { type: String, required: true }, // Cloudinary URL
        public_id: { type: String, required: true }, // Cloudinary public_id
        format: { type: String }, // Optional: image format (jpg, png, ...)
      },
    ],

    // Thời gian quảng cáo
    startDate: { type: Date, required: true }, // Thời gian bắt đầu
    endDate: { type: Date, required: true }, // Thời gian kết thúc

    // Trạng thái quảng cáo
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for performance
advertisementSchema.index({
  isActive: 1,
  startDate: 1,
  endDate: 1,
});

const Advertisement = mongoose.model("Advertisement", advertisementSchema);
module.exports = Advertisement;
