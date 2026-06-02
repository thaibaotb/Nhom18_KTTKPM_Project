const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
      index: true,
    },
    paymentLinkId: { type: String, index: true, sparse: true },
    orderCode: { type: String, index: true, sparse: true },
    transactionId: { type: String, index: true, sparse: true },
    provider: { type: String, default: "PAYOS" },
    checkoutUrl: { type: String },
  },
  {
    timestamps: true,
  },
);

paymentSchema.index({ orderId: 1 }, { unique: true });

module.exports = mongoose.model("Payment", paymentSchema);
