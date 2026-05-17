const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    totalPrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    cartVersion: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

orderSchema.index({ userId: 1, cartVersion: 1 }, { unique: true });

module.exports = mongoose.model("Order", orderSchema);
