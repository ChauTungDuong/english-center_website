const mongoose = require("mongoose");

const parentPaymentRequestSchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "credit_card", "e_wallet"],
      default: "bank_transfer",
    },
    note: {
      type: String,
      default: "",
    },
    proofImageUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    requestDate: {
      type: Date,
      default: Date.now,
    },
    processedDate: {
      type: Date,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    adminNote: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
parentPaymentRequestSchema.index({ parentId: 1, status: 1 });
parentPaymentRequestSchema.index({ paymentId: 1, status: 1 });
parentPaymentRequestSchema.index({ status: 1, requestDate: -1 });

const ParentPaymentRequest = mongoose.model(
  "ParentPaymentRequest",
  parentPaymentRequestSchema
);

module.exports = ParentPaymentRequest;
