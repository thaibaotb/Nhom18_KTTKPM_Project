const axios = require("axios");
const Outbox = require("../models/outbox.model");
const {
  orderServiceUrl,
  internalServiceSecret,
  maxRetries,
  backoffBaseMs,
  outboxPollInterval,
} = require("../config/env");
const { logPaymentEvent } = require("../utils/logger");
const metrics = require("../utils/metrics");

function backoffMs(attempt) {
  // attempt starts at 0, backoffBaseMs from config
  const base = Number(backoffBaseMs) || 500;
  const raw = base * Math.pow(2, attempt);
  // add jitter ±20%
  const jitter = raw * (Math.random() * 0.4 - 0.2);
  return Math.max(0, Math.round(raw + jitter));
}

class OutboxWorker {
  constructor({ pollInterval = Number(outboxPollInterval) || 5000 } = {}) {
    this.pollInterval = pollInterval;
    this.timer = null;
    this.running = false;
    this.maxRetries = Number(maxRetries) || 5;
  }

  async claimNext() {
    const now = new Date();
    const doc = await Outbox.findOneAndUpdate(
      {
        status: { $in: ["PENDING", "FAILED"] },
        nextRetryAt: { $lte: now },
        $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }],
      },
      { $set: { lockedUntil: new Date(Date.now() + 30 * 1000) } },
      { sort: { nextRetryAt: 1 }, new: true },
    ).lean();
    return doc;
  }

  async processOnce() {
    const doc = await this.claimNext();
    if (!doc) return;

    const { _id, type, payload, retryCount = 0 } = doc;
    metrics.inc("totalOutboxProcessed");
    logPaymentEvent("OUTBOX:PROCESS_START", {
      service: "payment-service",
      id: _id,
      type,
      payload,
      retryCount,
      timestamp: new Date().toISOString(),
    });

    try {
      if (type === "PAYMENT_SUCCESS") {
        if (!orderServiceUrl)
          throw new Error("Order service URL not configured");
        const url = `${orderServiceUrl.replace(/\/$/, "")}/internal/payment-success`;
        const headers = { "x-internal-secret": internalServiceSecret };
        await axios.post(url, payload, { timeout: 5000, headers });
        // mark SENT
        await Outbox.findByIdAndUpdate(_id, {
          $set: { status: "SENT", lockedUntil: null },
        });
        metrics.inc("totalOutboxSuccess");
        logPaymentEvent("OUTBOX:PROCESS_SENT", {
          service: "payment-service",
          id: _id,
          type,
          payload,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Unknown type -> fail permanently
      await Outbox.findByIdAndUpdate(_id, {
        $set: { status: "FAILED", lockedUntil: null },
      });
      metrics.inc("totalOutboxFailed");
      logPaymentEvent("OUTBOX:UNKNOWN_TYPE", {
        service: "payment-service",
        id: _id,
        type,
      });
    } catch (err) {
      // increment retry, compute nextRetryAt
      const nextRetry = retryCount + 1;
      const backoff = backoffMs(nextRetry - 1);
      const nextRetryAt = new Date(Date.now() + backoff);
      const update = {
        $set: { nextRetryAt, lockedUntil: null, lastError: err.message },
        $inc: { retryCount: 1 },
      };
      if (nextRetry >= this.maxRetries) {
        update.$set = Object.assign({}, update.$set, { status: "FAILED" });
        metrics.inc("totalOutboxFailed");
      }
      await Outbox.findByIdAndUpdate(_id, update);
      metrics.inc("totalRetries");
      logPaymentEvent("OUTBOX:PROCESS_RETRY", {
        service: "payment-service",
        id: _id,
        attempt: nextRetry,
        nextRetryAt,
        message: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(
      () =>
        this.processOnce().catch((e) =>
          logPaymentEvent("OUTBOX:WORKER_ERROR", {
            service: "payment-service",
            message: e.message,
          }),
        ),
      this.pollInterval,
    );
    logPaymentEvent("OUTBOX:WORKER_STARTED", {
      service: "payment-service",
      pollInterval: this.pollInterval,
      timestamp: new Date().toISOString(),
    });
  }

  stop() {
    if (!this.running) return;
    clearInterval(this.timer);
    this.running = false;
    logPaymentEvent("OUTBOX:WORKER_STOPPED", {
      service: "payment-service",
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = new OutboxWorker();
