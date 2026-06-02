const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    idempotencyKey: { type: String, index: true, sparse: true },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    totalPrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: [
        "PENDING",
        "WAITING_PAYMENT",
        "PAID",
        "FAILED",
        "CANCELLED",
        "COMPLETED",
        "SUCCESS",
      ],
      default: "PENDING",
      index: true,
    },
    paymentId: { type: String, index: true, sparse: true },
    paymentAttemptedAt: { type: Date },
    paymentExpiresAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    lockVersion: { type: Number, default: 0 },
    cartCleared: { type: Boolean, default: false },
    processedPaymentIds: { type: [String], default: [] },
    lastProcessedPaymentId: { type: String, index: true, sparse: true },
    cartVersion: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

orderSchema.index({ userId: 1, cartVersion: 1 }, { unique: true });
orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Order", orderSchema);
