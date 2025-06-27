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
    proofImageBase64: {
      type: String,
      default: "",
    },
    proofImageMimeType: {
      type: String,
      default: "",
    },
    proofImageSize: {
      type: Number,
      default: 0,
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
