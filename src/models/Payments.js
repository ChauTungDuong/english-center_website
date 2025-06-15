const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.ObjectId,
      ref: "Student",
      required: true,
    },
    classId: { type: mongoose.Schema.ObjectId, ref: "Class", required: true },
    parentId: { type: mongoose.Schema.ObjectId, ref: "Parent", required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    amount: { type: Number, default: 0 },
    totalLessons: { type: Number, default: 0 },
    attendedLessons: { type: Number, default: 0 },
    absentLessons: { type: Number, default: 0 },
    paymentDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
