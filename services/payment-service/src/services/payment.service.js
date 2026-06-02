const axios = require("axios");
const Payment = require("../models/payment.model");
const {
  createPaymentLink,
  verifyWebhookSignature,
} = require("../integrations/payos.client");
const { orderServiceUrl } = require("../config/env");
const { internalServiceSecret } = require("../config/env");
const { logPaymentEvent } = require("../utils/logger");

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.errorCode = "BAD_REQUEST";
  return error;
}

function isTerminalPaymentStatus(status) {
  return ["PAID", "FAILED"].includes(String(status || "").toUpperCase());
}

function isValidPayosCheckoutUrl(checkoutUrl) {
  return (
    typeof checkoutUrl === "string" &&
    /^https:\/\/pay\.payos\.vn\/web\/[a-f0-9]{32}\/??$/i.test(
      checkoutUrl.trim(),
    )
  );
}

function isValidPayosLinkId(paymentLinkId) {
  return (
    typeof paymentLinkId === "string" &&
    /^[a-f0-9]{32}$/i.test(paymentLinkId.trim())
  );
}

async function retryWithBackoff(fn, attempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
      }
    }
  }
  throw lastError;
}

class PaymentService {
  constructor({ paymentModel = Payment } = {}) {
    this.paymentModel = paymentModel;
    this.inFlightCreates = new Map();
  }

  async createPayment({
    orderId,
    amount,
    description,
    orderCode,
    returnUrl,
    cancelUrl,
    forceRecreate = false,
  }) {
    if (!orderId || !String(orderId).trim()) {
      throw badRequest("orderId is required");
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0) {
      throw badRequest("amount is required");
    }
    if (typeof description !== "undefined" && typeof description !== "string") {
      throw badRequest("description must be a string");
    }
    if (typeof returnUrl !== "undefined" && typeof returnUrl !== "string") {
      throw badRequest("returnUrl must be a string");
    }
    if (typeof cancelUrl !== "undefined" && typeof cancelUrl !== "string") {
      throw badRequest("cancelUrl must be a string");
    }

    const normalizedOrderId = String(orderId).trim();
    const normalizedAmount = Number(amount);
    const normalizedDescription = String(
      description || `Order ${normalizedOrderId}`,
    )
      .trim()
      .slice(0, 25);
    const recreateRequested = Boolean(forceRecreate);

    const existing = recreateRequested
      ? null
      : await this.paymentModel.findOne({
          orderId: normalizedOrderId,
        });
    if (
      existing &&
      isValidPayosCheckoutUrl(existing.checkoutUrl) &&
      isValidPayosLinkId(existing.paymentLinkId)
    ) {
      logPaymentEvent("PAYMENT_CREATED", {
        orderId: normalizedOrderId,
        amount: existing.amount,
        idempotencyHit: true,
      });
      return existing;
    }

    if (this.inFlightCreates.has(normalizedOrderId)) {
      return this.inFlightCreates.get(normalizedOrderId);
    }

    const createPromise = this._createPaymentInternal({
      orderId: normalizedOrderId,
      amount: normalizedAmount,
      description: normalizedDescription,
      orderCode: Number.isFinite(Number(orderCode)) ? Number(orderCode) : null,
      returnUrl: typeof returnUrl === "string" ? returnUrl.trim() : null,
      cancelUrl: typeof cancelUrl === "string" ? cancelUrl.trim() : null,
      forceRecreate: recreateRequested,
    });
    const inFlightKey = recreateRequested
      ? `${normalizedOrderId}:force:${Date.now()}`
      : normalizedOrderId;
    this.inFlightCreates.set(inFlightKey, createPromise);

    try {
      return await createPromise;
    } finally {
      this.inFlightCreates.delete(inFlightKey);
    }
  }

  async _createPaymentInternal({
    orderId,
    amount,
    description,
    orderCode = null,
    returnUrl = null,
    cancelUrl = null,
    forceRecreate = false,
  }) {
    if (!forceRecreate) {
      const existing = await this.paymentModel.findOne({ orderId });
      if (
        existing &&
        isValidPayosCheckoutUrl(existing.checkoutUrl) &&
        isValidPayosLinkId(existing.paymentLinkId)
      ) {
        return existing;
      }
    }

    try {
      const providerResponse = await createPaymentLink({
        orderId,
        amount,
        description,
        orderCode,
        returnUrl,
        cancelUrl,
      });
      const payment = await this.paymentModel.findOneAndUpdate(
        { orderId },
        {
          $set: {
            orderCode: providerResponse.orderCode || orderId,
            amount,
            status: "PENDING",
            provider: "PAYOS",
            paymentLinkId: providerResponse.paymentLinkId,
            checkoutUrl: providerResponse.checkoutUrl,
          },
        },
        { new: true, upsert: true },
      );

      logPaymentEvent("PAYMENT_CREATED", {
        orderId,
        paymentLinkId: payment.paymentLinkId,
        checkoutUrl: payment.checkoutUrl,
        amount,
      });

      return payment;
    } catch (error) {
      if (error && error.code === 11000) {
        const existingPayment = await this.paymentModel.findOne({ orderId });
        if (existingPayment) {
          return existingPayment;
        }
      }

      logPaymentEvent("PAYMENT_FAILED", {
        orderId,
        amount,
        error: error.message,
      });
      throw error;
    }
  }

  async handleWebhook({ payload, signature }) {
    logPaymentEvent("WEBHOOK_RECEIVED", { provider: "PAYOS" });

    if (!verifyWebhookSignature(payload, signature)) {
      const error = new Error("Invalid signature");
      error.statusCode = 400;
      error.errorCode = "INVALID_SIGNATURE";
      throw error;
    }

    const rawPayload = Buffer.isBuffer(payload)
      ? payload.toString("utf8")
      : payload;
    let data;
    try {
      data =
        typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
    } catch (error) {
      const invalid = new Error("Invalid webhook body");
      invalid.statusCode = 400;
      invalid.errorCode = "BAD_REQUEST";
      throw invalid;
    }

    const orderCode = String(data.orderCode || data.paymentLinkId || "").trim();
    const transactionId = String(data.transactionId || data.id || "").trim();
    const status = String(data.status || data.code || "").toUpperCase();

    if (!orderCode || !status) {
      throw badRequest("Invalid webhook payload");
    }

    const paymentLinkId = orderCode;

    const payment = await this.paymentModel.findOne({
      $or: [
        { paymentLinkId },
        { orderCode: String(orderCode) },
        { orderId: paymentLinkId },
        { transactionId },
      ],
    });
    if (!payment) {
      console.log("[PAYMENT_SERVICE] [WEBHOOK] [IGNORED] payment not found", {
        orderCode,
        status,
      });
      return { ignored: true };
    }

    if (isTerminalPaymentStatus(payment.status)) {
      console.log("[PAYMENT_SERVICE] [WEBHOOK] [IGNORED] terminal payment", {
        orderId: payment.orderId,
        status: payment.status,
      });
      return payment;
    }

    if (status !== "SUCCESS" && status !== "PAID" && status !== "COMPLETED") {
      const failed = await this.paymentModel.findOneAndUpdate(
        { _id: payment._id },
        {
          $set: {
            status: "FAILED",
            transactionId: transactionId || payment.transactionId,
          },
        },
        { new: true },
      );
      logPaymentEvent("PAYMENT_FAILED", {
        orderId: failed.orderId,
        paymentLinkId: failed.paymentLinkId,
        transactionId: failed.transactionId,
      });
      return failed;
    }

    const updated = await this.paymentModel.findOneAndUpdate(
      { _id: payment._id, status: { $ne: "PAID" } },
      {
        $set: {
          status: "PAID",
          transactionId: transactionId || payment.transactionId,
        },
      },
      { new: true },
    );

    if (!updated) {
      return payment;
    }

    logPaymentEvent("PAYMENT_SUCCESS", {
      orderId: updated.orderId,
      paymentLinkId: updated.paymentLinkId,
      transactionId: updated.transactionId,
    });

    // Enqueue delivery via Outbox for eventual delivery to Order Service
    try {
      const Outbox = require("../models/outbox.model");
      const out = await Outbox.create({
        type: "PAYMENT_SUCCESS",
        payload: {
          orderId: updated.orderId,
          paymentId: String(updated._id),
          status: "PAID",
        },
        status: "PENDING",
        retryCount: 0,
        nextRetryAt: new Date(),
      });
      logPaymentEvent("OUTBOX_CREATED", {
        outboxId: out._id,
        orderId: updated.orderId,
      });
    } catch (e) {
      logPaymentEvent("OUTBOX_CREATE_ERROR", { message: e.message });
      // Fallback: best-effort direct notify to avoid losing the event if outbox persist fails
      try {
        await this.notifyOrderService(updated.orderId, "PAID");
      } catch (err) {
        logPaymentEvent("NOTIFY_FALLBACK_FAILED", { message: err.message });
      }
    }

    return updated;
  }

  async notifyOrderService(orderId, status) {
    if (!orderServiceUrl) return;
    const maxRetries = 5;
    let attempt = 0;
    const delay = (n) => new Promise((r) => setTimeout(r, n));
    const headers = {
      "x-internal-secret": require("../config/env").internalServiceSecret,
    };

    const url = `${orderServiceUrl.replace(/\/$/, "")}/internal/payment-success`;
    console.log("[PAYMENT_SERVICE] [CALL_ORDER_SERVICE] [START]", {
      orderId,
      status,
      url,
    });

    while (attempt < maxRetries) {
      try {
        await axios.post(url, { orderId, status }, { timeout: 5000, headers });
        console.log("[PAYMENT_SERVICE] [CALL_ORDER_SERVICE] [SUCCESS]", {
          orderId,
          status,
          attempt: attempt + 1,
        });
        // reset callbackAttempts metadata if any
        try {
          await this.paymentModel.findOneAndUpdate(
            { orderId },
            { $set: { callbackAttempts: 0, callbackStatus: "DELIVERED" } },
          );
        } catch (e) {}
        return;
      } catch (error) {
        attempt += 1;
        const backoff = 500 * Math.pow(2, attempt - 1);
        console.error("[PAYMENT_SERVICE] [CALL_ORDER_SERVICE] [RETRY]", {
          orderId,
          status,
          attempt,
          message: error.message,
          nextDelayMs: backoff,
        });
        // record attempt
        try {
          await this.paymentModel.findOneAndUpdate(
            { orderId },
            {
              $inc: { callbackAttempts: 1 },
              $set: { callbackLastError: error.message },
            },
          );
        } catch (e) {}
        if (attempt >= maxRetries) {
          console.error("[PAYMENT_SERVICE] [CALL_ORDER_SERVICE] [FAILED]", {
            orderId,
            status,
            attempts: attempt,
            message: error.message,
          });
          // mark event as FAILED for future queue processing
          try {
            await this.paymentModel.findOneAndUpdate(
              { orderId },
              {
                $set: {
                  callbackStatus: "FAILED",
                  callbackLastError: error.message,
                },
              },
            );
          } catch (e) {}
          return;
        }
        await delay(backoff);
      }
    }
  }

  async getPayment(id) {
    if (!id) return null;
    const queryValue = String(id);
    const lookup = {
      $or: [
        { orderId: queryValue },
        { orderCode: queryValue },
        { paymentLinkId: queryValue },
        { transactionId: queryValue },
      ],
    };

    if (this.paymentModel?.base?.Types?.ObjectId?.isValid?.(queryValue)) {
      lookup.$or.push({ _id: queryValue });
    }

    const payment = await this.paymentModel
      .findOne(lookup)
      .lean();
    return payment;
  }
}

module.exports = new PaymentService();
module.exports.PaymentService = PaymentService;
