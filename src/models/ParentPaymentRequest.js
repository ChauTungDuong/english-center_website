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
    // Cloudinary image info for proof image
    proofImageUrl: {
      type: String,
      default: "",
    },
    proofImagePublicId: {
      type: String,
      default: "",
    },
    proofImageFormat: {
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
parentPaymentRequestSchema.index({ parentId: 1, status: 1 }); // Query requests by parent and status
parentPaymentRequestSchema.index({ paymentId: 1 }); // Find requests for specific payment
parentPaymentRequestSchema.index({ status: 1, requestDate: -1 }); // Query by status, sorted by date
parentPaymentRequestSchema.index({ studentId: 1, status: 1 }); // Query by student and status
parentPaymentRequestSchema.index({ createdAt: -1 }); // Sort by creation date
parentPaymentRequestSchema.index({ processedDate: -1 }); // Query processed requests

const ParentPaymentRequest = mongoose.model(
  "ParentPaymentRequest",
  parentPaymentRequestSchema
);

module.exports = ParentPaymentRequest;
