const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.ObjectId,
      ref: "Student",
      required: true,
    },
    classId: { type: mongoose.Schema.ObjectId, ref: "Class", required: true },
    parentId: { type: mongoose.Schema.ObjectId, ref: "Parent" },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    discountPercentage: { type: Number, default: 0 },
    originalAmount: { type: Number, default: 0 },
    afterDiscountAmount: { type: Number, default: 0 },
    amountDue: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    totalLessons: { type: Number, default: 0 },
    attendedLessons: { type: Number, default: 0 },
    absentLessons: { type: Number, default: 0 },
    paymentHistory: [
      {
        amount: Number,
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for better query performance
paymentSchema.index({ studentId: 1, classId: 1, month: 1, year: 1 }); // Composite index for common queries
paymentSchema.index({ studentId: 1, month: 1, year: 1 }); // Query payments by student and time
paymentSchema.index({ classId: 1, month: 1, year: 1 }); // Query payments by class and time
paymentSchema.index({ amountDue: 1, amountPaid: 1 }); // For unpaid payments queries
paymentSchema.index({ "paymentHistory.date": -1 }); // For payment history sorting
paymentSchema.index({ parentId: 1 }); // For parent payment queries
paymentSchema.index({ createdAt: -1 }); // For sorting by creation date

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
