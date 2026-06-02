const mongoose = require("mongoose");

const outboxSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED"],
      default: "PENDING",
      index: true,
    },
    retryCount: { type: Number, default: 0 },
    nextRetryAt: { type: Date, default: Date.now, index: true },
    lockedUntil: { type: Date, default: null },
    lastError: { type: String, default: null },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  },
);
outboxSchema.index({ status: 1, nextRetryAt: 1 });

module.exports = mongoose.model("Outbox", outboxSchema);
