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
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
