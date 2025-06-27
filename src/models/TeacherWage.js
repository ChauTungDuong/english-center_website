const mongoose = require("mongoose");

const teacherWageSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.ObjectId,
      ref: "Teacher",
      required: true,
    },
    classId: {
      type: mongoose.Schema.ObjectId,
      ref: "Class",
    },
    amount: {
      type: Number,
      required: true,
    },
    lessonTaught: {
      type: Number,
      default: 0,
    },
    month: {
      type: Number,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    // Payment tracking fields
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "full"],
      default: "unpaid",
    },
    paymentDate: {
      type: Date,
    },
    paidBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User", // Admin who made the payment
    },
    // Calculation result
    calculatedAmount: {
      type: Number,
      default: 0, // lessonTaught * teacher.wagePerLesson (from Teacher model)
    },
    remainingAmount: {
      type: Number,
      default: 0, // calculatedAmount - amount (số tiền còn thiếu)
    },
  },
  { timestamps: true }
);

// Indexes for better performance
teacherWageSchema.index({ teacherId: 1, month: 1, year: 1 });
teacherWageSchema.index({ paymentStatus: 1, month: 1, year: 1 });
teacherWageSchema.index({ classId: 1, month: 1, year: 1 });

// Pre-save middleware to calculate payment status and remaining amount
teacherWageSchema.pre("save", function () {
  // REMOVED: Auto-set amount = calculatedAmount logic
  // Amount should only be set when actual payment is made

  // Đảm bảo amount có giá trị mặc định
  if (this.amount === undefined || this.amount === null) {
    this.amount = 0;
  }

  // Tính remainingAmount
  this.remainingAmount = Math.max(0, this.calculatedAmount - this.amount);

  // Cập nhật paymentStatus
  if (this.amount === 0) {
    this.paymentStatus = "unpaid";
  } else if (this.amount >= this.calculatedAmount) {
    this.paymentStatus = "full";
  } else {
    this.paymentStatus = "partial";
  }
});

// Virtual field để tính phần trăm đã thanh toán
teacherWageSchema.virtual("paymentPercentage").get(function () {
  if (this.calculatedAmount === 0) return 0;
  return Math.round((this.amount / this.calculatedAmount) * 100);
});

// Ensure virtual fields are serialized
teacherWageSchema.set("toJSON", { virtuals: true });
teacherWageSchema.set("toObject", { virtuals: true });

const TeacherWage = mongoose.model("TeacherWage", teacherWageSchema);
module.exports = TeacherWage;
