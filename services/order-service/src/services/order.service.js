const Order = require("../models/order.model");
const { getProductById } = require("./productClient.service");
const axios = require("axios");
const { paymentServiceUrl } = require("../config/env");
const mongoose = require("mongoose");
const crypto = require("crypto");
const eventBus = require("./eventBus.service");

class BadRequest extends Error {
  constructor(message) {
    super(message);
    this.name = "BadRequest";
    this.statusCode = 400;
  }
}

function log(level, event, meta = {}) {
  const msg = { ts: new Date().toISOString(), level, event, ...meta };
  if (level === "error") console.error(JSON.stringify(msg));
  else if (level === "warn") console.warn(JSON.stringify(msg));
  else console.info(JSON.stringify(msg));
}

// Simple in-process metrics collector (replace with Prometheus client in prod)
const metrics = {
  counters: {
    checkout_success: 0,
    checkout_failure: 0,
    retries: 0,
    webhook_replays: 0,
    reconcile_processed: 0,
  },
  inc(name, v = 1) {
    if (!this.counters[name]) this.counters[name] = 0;
    this.counters[name] += v;
  },
};

// Retry helper with exponential backoff
function isTransientError(err) {
  if (!err) return false;
  if (!err.response) return true; // network error
  const status = err.response.status;
  if (status >= 500 || status === 429) return true;
  return false;
}

async function retryWithBackoff(
  fn,
  {
    retries = 3,
    baseDelay = 200,
    factor = 2,
    onRetry,
    isTransient = isTransientError,
  } = {},
) {
  let attempt = 0;
  let lastErr;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;
      if (attempt === retries) break;
      const delay = baseDelay * Math.pow(factor, attempt);
      if (onRetry) onRetry(attempt + 1, err);
      // record retry metric
      try {
        metrics.inc("retries");
      } catch (e) {}
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
    }
  }
  throw lastErr;
}

async function getPaymentStatusFromPaymentService(paymentId) {
  if (!paymentId) return null;
  if (!paymentServiceUrl) return null;
  try {
    const resp = await axios.get(
      `${paymentServiceUrl.replace(/\/$/, "")}/payments/${encodeURIComponent(
        String(paymentId),
      )}`,
      { timeout: 5000 },
    );
    return resp.data && resp.data.data ? resp.data.data : resp.data;
  } catch (err) {
    // treat as transient error for callers using retryWithBackoff
    throw err;
  }
}

function computeIdempotencyKey(userId, cart) {
  // Normalize cart items ordering to make idempotency key invariant to item order
  const items = (cart.items || []).map((it) => ({
    productId: String(it.productId),
    quantity: Number(it.quantity),
  }));
  items.sort((a, b) => {
    if (a.productId < b.productId) return -1;
    if (a.productId > b.productId) return 1;
    return a.quantity - b.quantity;
  });
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify({ userId, items }));
  return hash.digest("hex");
}

function computeCartVersionFromKey(idempotencyKey) {
  const hash = crypto.createHash("sha256");
  hash.update(String(idempotencyKey || ""));
  return parseInt(hash.digest("hex").slice(0, 8), 16);
}

function extractCheckoutUrl(order) {
  if (!order) return null;
  return (
    (order.metadata && order.metadata.checkoutUrl) ||
    order.checkoutUrl ||
    order.paymentUrl ||
    null
  );
}

function paymentStatusToOrderStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "success" || normalized === "paid") {
    return "PAID";
  }
  if (
    normalized === "failed" ||
    normalized === "cancel" ||
    normalized === "cancelled"
  ) {
    return "FAILED";
  }
  return null;
}

function resolveReturnUrl(returnUrl) {
  const configuredBase =
    process.env.CLIENT_RETURN_URL ||
    process.env.PAYOS_RETURN_URL ||
    process.env.FRONTEND_URL ||
    "";
  const fallback = configuredBase
    ? configuredBase
        .replace(/\/$/, "")
        .replace(/\/payments\/return$/i, "/payment/return")
    : "http://localhost:5173/payment/return";
  return typeof returnUrl === "string" && returnUrl.trim()
    ? returnUrl.trim()
    : fallback;
}

function isValidCheckoutUrl(checkoutUrl) {
  if (typeof checkoutUrl !== "string" || !checkoutUrl.trim()) return false;
  const normalized = checkoutUrl.trim();
  if (!/^https:\/\/pay\.payos\.vn\/web\/[a-f0-9]{32}\/?$/i.test(normalized)) {
    return false;
  }
  return true;
}

function normalizeCheckoutUrl(checkoutUrl) {
  return isValidCheckoutUrl(checkoutUrl) ? String(checkoutUrl).trim() : null;
}

class OrderService {
  isValidTransition(from, to) {
    const allowed = {
      PENDING: ["WAITING_PAYMENT"],
      WAITING_PAYMENT: ["PAID", "FAILED"],
      PAID: ["COMPLETED"],
      FAILED: [],
      CANCELLED: [],
      COMPLETED: [],
    };
    return Array.isArray(allowed[from]) && allowed[from].includes(to);
  }

  async _createPayment(order, returnUrl, correlationId = null, options = {}) {
    const finalReturnUrl = resolveReturnUrl(returnUrl);
    // Ensure Payment Service will redirect back with our internal order id so frontend can resolve it
    const returnWithOrderId = `${finalReturnUrl}${finalReturnUrl.includes("?") ? "&" : "?"}orderId=${encodeURIComponent(
      String(order._id),
    )}`;

    const payload = {
      orderId: String(order._id),
      amount: Math.round(order.totalPrice || 0),
      description: `Order ${order._id}`,
      orderCode: Number.parseInt(
        `${Date.now().toString().slice(-6)}${crypto.randomInt(0, 100).toString().padStart(2, "0")}`,
        10,
      ),
      returnUrl: returnWithOrderId,
    };

    const createPayment = async () => {
      if (!paymentServiceUrl) {
        throw new Error("Payment service URL not configured");
      }
      const resp = await axios.post(
        `${paymentServiceUrl.replace(/\/$/, "")}/payments`,
        { ...payload, forceRecreate: Boolean(options.forceRecreate) },
        { timeout: 5000 },
      );
      return resp.data && resp.data.data ? resp.data.data : resp.data;
    };

    const axiosCall = async (payload) => {
      return axios.post(
        `${paymentServiceUrl.replace(/\/$/, "")}/payments`,
        payload,
        { timeout: 5000 },
      );
    };

    const CircuitBreaker = require("../utils/circuitBreaker");
    if (!this._paymentBreaker) {
      this._paymentBreaker = new CircuitBreaker(
        (payload) => axiosCall(payload),
        { failureThreshold: 5, resetTimeout: 30000 },
      );
    }

    const rawPaymentResp = await this._paymentBreaker.fire({
      ...payload,
      forceRecreate: Boolean(options.forceRecreate),
    });
    const paymentResp =
      rawPaymentResp && rawPaymentResp.data && rawPaymentResp.data.data
        ? rawPaymentResp.data.data
        : rawPaymentResp && rawPaymentResp.data
          ? rawPaymentResp.data
          : rawPaymentResp;

    const paymentId =
      paymentResp._id || paymentResp.paymentId || paymentResp.paymentLinkId;
    const checkoutUrl =
      paymentResp.checkoutUrl ||
      paymentResp.checkout_url ||
      paymentResp.checkoutLink;
    if (!paymentId) {
      throw new Error("Payment Service did not return paymentId");
    }

    return {
      paymentId,
      checkoutUrl,
      returnUrl: returnWithOrderId,
      amount: paymentResp.amount,
    };
  }

  async _claimCartClear(orderId) {
    return Order.findOneAndUpdate(
      { _id: orderId, cartCleared: false },
      { $set: { cartCleared: true }, $inc: { lockVersion: 1 } },
      { new: true },
    );
  }

  async _publishCartClear(order) {
    const claimed = await this._claimCartClear(order._id);
    if (!claimed) {
      return null;
    }

    await retryWithBackoff(
      () =>
        eventBus.publish("ClearCart", {
          userId: claimed.userId,
          orderId: claimed._id.toString(),
          cartVersion: claimed.cartVersion,
        }),
      { retries: 2 },
    );

    return claimed;
  }

  // Create order from request items. ctx: { items, correlationId }
  async createOrderFromCart(userId, returnUrl, idempotencyKey, ctx = {}) {
    const correlationId = ctx.correlationId || null;
    if (!userId) {
      const e = new Error("userId required");
      e.statusCode = 400;
      throw e;
    }

    const items = Array.isArray(ctx.items) ? ctx.items : [];
    if (!items || items.length === 0) {
      throw new BadRequest("Cart is empty");
    }

    for (const item of items) {
      if (!item || !item.productId) {
        throw new BadRequest("Invalid item: productId is required");
      }
      if (
        !Number.isFinite(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        throw new BadRequest(`Invalid quantity for product ${item.productId}`);
      }
      if (!Number.isFinite(Number(item.price)) || Number(item.price) <= 0) {
        throw new BadRequest(`Invalid price for product ${item.productId}`);
      }
    }

    const totalAmount = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0,
    );

    // Compute idempotencyKey from request snapshot if not provided
    if (!idempotencyKey) {
      const cartSnapshot = {
        items,
        totalPrice: totalAmount,
      };
      idempotencyKey = computeIdempotencyKey(userId, cartSnapshot);
      log("info", "checkout:computed-idempotency", {
        userId,
        idempotencyKey,
        correlationId,
      });
    }

    // Keep cartVersion deterministic per checkout snapshot so unique index
    // collisions do not happen on every direct checkout request.
    let cartVersion = computeCartVersionFromKey(idempotencyKey);

    const ensureCheckoutUrlForActiveOrder = async (existingOrder) => {
      const existingCheckoutUrl =
        existingOrder &&
        existingOrder.metadata &&
        typeof existingOrder.metadata.checkoutUrl === "string"
          ? existingOrder.metadata.checkoutUrl
          : null;

      const isExpiredPayment =
        existingOrder &&
        existingOrder.paymentExpiresAt &&
        new Date(existingOrder.paymentExpiresAt).getTime() <= Date.now();

      // If checkoutUrl looks valid and not expired, verify payment amount
      if (isValidCheckoutUrl(existingCheckoutUrl) && !isExpiredPayment) {
        try {
          // compute desired payment amount from the canonical order total
          const desiredAmount = Math.round(existingOrder.totalPrice || 0);

          if (existingOrder.paymentId) {
            const payInfo = await getPaymentStatusFromPaymentService(
              existingOrder.paymentId,
            );
            const providerCheckoutUrl = isValidCheckoutUrl(
              payInfo && payInfo.checkoutUrl,
            )
              ? String(payInfo.checkoutUrl).trim()
              : null;
            if (
              typeof payInfo.amount !== "undefined" &&
              Number(payInfo.amount) !== Number(desiredAmount)
            ) {
              // mismatch -> treat as invalid so we will recreate a correct checkout
              log("info", "checkout:checkout-amount-mismatch", {
                userId,
                orderId: existingOrder._id.toString(),
                paymentAmount: payInfo.amount,
                expectedAmount: desiredAmount,
                correlationId,
              });
            } else if (
              providerCheckoutUrl &&
              providerCheckoutUrl !== existingCheckoutUrl
            ) {
              return {
                order: existingOrder,
                checkoutUrl: providerCheckoutUrl,
                returnUrl:
                  existingOrder.metadata && existingOrder.metadata.returnUrl
                    ? existingOrder.metadata.returnUrl
                    : resolveReturnUrl(returnUrl),
              };
            } else {
              return {
                order: existingOrder,
                checkoutUrl: existingCheckoutUrl,
                returnUrl:
                  existingOrder.metadata && existingOrder.metadata.returnUrl
                    ? existingOrder.metadata.returnUrl
                    : resolveReturnUrl(returnUrl),
              };
            }
          } else {
            return {
              order: existingOrder,
              checkoutUrl: existingCheckoutUrl,
              returnUrl:
                existingOrder.metadata && existingOrder.metadata.returnUrl
                  ? existingOrder.metadata.returnUrl
                  : resolveReturnUrl(returnUrl),
            };
          }
        } catch (err) {
          // if verification fails, fall through to recreate payment
          log("warn", "checkout:verify-payment-failed", {
            orderId: existingOrder._id.toString(),
            error: err.message,
            correlationId,
          });
        }
      }

      if (
        !existingOrder ||
        !["PENDING", "WAITING_PAYMENT"].includes(existingOrder.status)
      ) {
        return {
          order: existingOrder,
          checkoutUrl: null,
          returnUrl: resolveReturnUrl(returnUrl),
        };
      }

      if (existingOrder.status === "PENDING") {
        const waitingOrder = await Order.findOne({
          userId,
          status: "WAITING_PAYMENT",
          _id: { $ne: existingOrder._id },
        }).sort({ createdAt: -1 });
        if (waitingOrder) {
          return ensureCheckoutUrlForActiveOrder(waitingOrder);
        }
      }

      const paymentResp = await this._createPayment(
        existingOrder,
        returnUrl,
        correlationId,
        {
          forceRecreate: !isValidCheckoutUrl(existingCheckoutUrl),
        },
      );
      const finalReturnUrl = paymentResp.returnUrl;
      const nextCheckoutUrl =
        normalizeCheckoutUrl(paymentResp.checkoutUrl) ||
        normalizeCheckoutUrl(
          existingOrder.metadata && existingOrder.metadata.checkoutUrl,
        ) ||
        null;
      const nextPaymentId = paymentResp.paymentId || paymentResp.paymentLinkId;
      const nextPaymentAmount =
        typeof paymentResp.amount !== "undefined" ? paymentResp.amount : null;

      let updatedOrder = null;
      try {
        updatedOrder = await Order.findOneAndUpdate(
          {
            _id: existingOrder._id,
            status: { $in: ["PENDING", "WAITING_PAYMENT"] },
          },
          {
            $set: {
              paymentId: nextPaymentId,
              status: "WAITING_PAYMENT",
              paymentAttemptedAt: new Date(),
              paymentExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
              metadata: Object.assign({}, existingOrder.metadata || {}, {
                checkoutUrl: nextCheckoutUrl,
                returnUrl: finalReturnUrl,
                paymentAmount: nextPaymentAmount,
              }),
            },
            $inc: { lockVersion: 1 },
          },
          { new: true },
        );
      } catch (err) {
        if (err && err.code === 11000) {
          const fallbackWaitingOrder = await Order.findOne({
            userId,
            status: "WAITING_PAYMENT",
          }).sort({ createdAt: -1 });
          if (fallbackWaitingOrder) {
            return ensureCheckoutUrlForActiveOrder(fallbackWaitingOrder);
          }
        }
        throw err;
      }

      return {
        order: updatedOrder || existingOrder,
        checkoutUrl:
          (updatedOrder &&
            updatedOrder.metadata &&
            updatedOrder.metadata.checkoutUrl) ||
          nextCheckoutUrl,
        paymentUrl:
          (updatedOrder &&
            updatedOrder.metadata &&
            updatedOrder.metadata.checkoutUrl) ||
          nextCheckoutUrl,
        returnUrl: finalReturnUrl,
      };
    };

    // If an order with the same idempotencyKey exists, return it instead of
    // forcing a new checkout. The snapshot is already the same.
    let existingByIdempotency = null;
    if (idempotencyKey) {
      existingByIdempotency = await Order.findOne({ idempotencyKey });
      if (existingByIdempotency) {
        if (
          ["PAID", "FAILED", "CANCELLED", "COMPLETED", "SUCCESS"].includes(
            existingByIdempotency.status,
          )
        ) {
          log("info", "checkout:idempotency-terminal-order", {
            userId,
            orderId: existingByIdempotency._id.toString(),
            existingStatus: existingByIdempotency.status,
            correlationId,
          });
          idempotencyKey = `${idempotencyKey}:${Date.now()}`;
          cartVersion = computeCartVersionFromKey(idempotencyKey);
          existingByIdempotency = null;
        }
      }

      if (existingByIdempotency) {
        const resolved = await ensureCheckoutUrlForActiveOrder(
          existingByIdempotency,
        );
        let checkoutUrl =
          normalizeCheckoutUrl(resolved.checkoutUrl) ||
          normalizeCheckoutUrl(extractCheckoutUrl(existingByIdempotency));

        if (!checkoutUrl) {
          const paymentResp = await this._createPayment(
            existingByIdempotency,
            returnUrl,
            correlationId,
            {
              forceRecreate: true,
            },
          );
          const finalReturnUrl = paymentResp.returnUrl;
          checkoutUrl =
            normalizeCheckoutUrl(paymentResp.checkoutUrl) ||
            normalizeCheckoutUrl(paymentResp.checkout_url) ||
            normalizeCheckoutUrl(paymentResp.checkoutLink) ||
            null;
          const nextPaymentId =
            paymentResp.paymentId || paymentResp.paymentLinkId;
          const nextPaymentAmount =
            typeof paymentResp.amount !== "undefined"
              ? paymentResp.amount
              : null;

          const updatedExisting = await Order.findOneAndUpdate(
            { _id: existingByIdempotency._id },
            {
              $set: {
                paymentId: nextPaymentId,
                status: "WAITING_PAYMENT",
                paymentAttemptedAt: new Date(),
                paymentExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
                metadata: Object.assign({}, existingByIdempotency.metadata || {}, {
                  checkoutUrl,
                  returnUrl: finalReturnUrl,
                  paymentAmount: nextPaymentAmount,
                }),
              },
            },
            { new: true },
          );

          log("info", "checkout:idempotent-resumed", {
            userId,
            orderId: existingByIdempotency._id.toString(),
            correlationId,
          });

          return {
            orderId: existingByIdempotency._id.toString(),
            checkoutUrl,
            paymentUrl: checkoutUrl,
            returnUrl: finalReturnUrl,
            order: updatedExisting || existingByIdempotency,
          };
        }

        log("info", "checkout:idempotent-hit", {
          userId,
          orderId: existingByIdempotency._id.toString(),
          correlationId,
        });
        return {
          orderId: existingByIdempotency._id.toString(),
          checkoutUrl,
          paymentUrl: checkoutUrl,
          returnUrl: resolved.returnUrl,
          order: resolved.order,
        };
      }
    }

    // Reuse latest active waiting-payment order for this user only when it
    // corresponds to the same cart snapshot (idempotencyKey). If the user
    // started a different checkout earlier, cancel that previous waiting
    // order so we can create a new checkout for the current items.
    const existingWaitingOrder = await Order.findOne({
      userId,
      status: "WAITING_PAYMENT",
    }).sort({ createdAt: -1 });
    if (existingWaitingOrder) {
      // Always attempt to cancel any existing WAITING_PAYMENT order to force
      // creation of a fresh checkout (even if idempotency previously matched).
      try {
        const cancelled = await Order.findOneAndUpdate(
          { _id: existingWaitingOrder._id, status: "WAITING_PAYMENT" },
          { $set: { status: "CANCELLED" }, $inc: { lockVersion: 1 } },
          { new: true },
        );
        if (cancelled) {
          log("info", "checkout:cancelled-old-waiting-order", {
            userId,
            orderId: cancelled._id.toString(),
            correlationId,
          });
        }
      } catch (err) {
        log("warn", "checkout:cancel-waiting-failed", {
          userId,
          orderId: existingWaitingOrder._id.toString(),
          error: err.message,
          correlationId,
        });
        const resolved =
          await ensureCheckoutUrlForActiveOrder(existingWaitingOrder);
        return {
          orderId: existingWaitingOrder._id.toString(),
          checkoutUrl: resolved.checkoutUrl,
          returnUrl: resolved.returnUrl,
          order: resolved.order,
        };
      }
    }

    // Validate each item against product service (with retries)
    const snapshots = [];
    for (const it of items) {
      const p = await retryWithBackoff(() => getProductById(it.productId), {
        retries: 2,
        baseDelay: 150,
        onRetry: (attempt, err) =>
          log("warn", "checkout:product-retry", {
            productId: it.productId,
            attempt,
            error: err.message,
            correlationId,
          }),
      });
      if (!p) {
        const e = new Error(`Product ${it.productId} not found`);
        e.statusCode = 404;
        throw e;
      }
      if (p.stock < it.quantity) {
        const e = new Error(`Insufficient stock for product ${it.productId}`);
        e.statusCode = 400;
        throw e;
      }
      snapshots.push({
        productId: new mongoose.Types.ObjectId(p._id),
        name:
          typeof it.name === "string" && it.name.trim()
            ? it.name.trim()
            : p.name,
        price: Number(it.price),
        quantity: Number(it.quantity),
      });
    }

    // Build order document
    const orderDoc = {
      userId,
      items: snapshots,
      totalPrice: totalAmount,
      status: "PENDING",
      cartVersion,
    };
    if (idempotencyKey) orderDoc.idempotencyKey = idempotencyKey;

    // Try create (may throw duplicate key if idempotencyKey collided)
    let order;
    try {
      order = await Order.create(orderDoc);
      log("info", "checkout:created-order", {
        userId,
        orderId: order._id.toString(),
        totalPrice: totalAmount,
        correlationId,
      });
    } catch (err) {
      if (err && err.code === 11000) {
        log("warn", "checkout:duplicate-key", {
          userId,
          error: err.message,
          correlationId,
        });
        if (idempotencyKey) {
          const existing = await Order.findOne({ idempotencyKey });
          if (existing) {
            const resolved = await ensureCheckoutUrlForActiveOrder(existing);
            log("info", "checkout:return-existing-by-idempotency", {
              userId,
              orderId: existing._id.toString(),
              hasCheckoutUrl: Boolean(resolved.checkoutUrl),
              correlationId,
            });
            return {
              orderId: existing._id.toString(),
              checkoutUrl: resolved.checkoutUrl,
              returnUrl: resolved.returnUrl,
              order: resolved.order,
            };
          }
        }
        // fallback: attempt to find any active order for same user
        const fallback = await Order.findOne({
          userId,
          status: { $in: ["PENDING", "WAITING_PAYMENT"] },
        }).sort({ createdAt: -1 });
        if (fallback) {
          const resolved = await ensureCheckoutUrlForActiveOrder(fallback);
          return {
            orderId: fallback._id.toString(),
            checkoutUrl: resolved.checkoutUrl,
            returnUrl: resolved.returnUrl,
            order: resolved.order,
          };
        }
      }
      throw err;
    }

    // Create payment with retries
    let paymentResp;
    try {
      paymentResp = await this._createPayment(order, returnUrl, correlationId);
    } catch (err) {
      // mark order failed
      await Order.findOneAndUpdate(
        { _id: order._id, status: "PENDING" },
        { $set: { status: "FAILED" }, $inc: { lockVersion: 1 } },
      );
      log("error", "checkout:payment-create-failed", {
        orderId: order._id.toString(),
        error: err.message,
        correlationId,
      });
      try {
        metrics.inc("checkout_failure");
      } catch (e) {}
      const e = new Error("Payment creation failed");
      e.statusCode = 502;
      throw e;
    }

    const {
      paymentId,
      checkoutUrl,
      returnUrl: finalReturnUrl,
      amount: paymentAmount,
    } = paymentResp;

    // Optimistic update to WAITING_PAYMENT using lockVersion
    let updated = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await Order.findById(order._id).lean();
      if (!this.isValidTransition(current.status, "WAITING_PAYMENT")) {
        log("error", "checkout:invalid-transition", {
          orderId: order._id.toString(),
          from: current.status,
          to: "WAITING_PAYMENT",
          correlationId,
        });
        throw new Error("Invalid state transition");
      }
      try {
        updated = await Order.findOneAndUpdate(
          {
            _id: order._id,
            status: "PENDING",
            lockVersion: current.lockVersion,
          },
          {
            $set: {
              paymentId,
              status: "WAITING_PAYMENT",
              paymentAttemptedAt: new Date(),
              // set expiration for payment (15 minutes)
              paymentExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
              metadata: Object.assign({}, current.metadata || {}, {
                checkoutUrl,
                returnUrl: finalReturnUrl,
                paymentAmount:
                  typeof paymentAmount !== "undefined" ? paymentAmount : null,
              }),
            },
            $inc: { lockVersion: 1 },
          },
          { new: true },
        );
      } catch (err) {
        if (err && err.code === 11000) {
          const fallbackWaitingOrder = await Order.findOne({
            userId,
            status: "WAITING_PAYMENT",
          }).sort({ createdAt: -1 });
          if (fallbackWaitingOrder) {
            log("warn", "checkout:status-conflict-reuse-waiting-order", {
              userId,
              createdOrderId: order._id.toString(),
              waitingOrderId: fallbackWaitingOrder._id.toString(),
              correlationId,
            });
            const resolved =
              await ensureCheckoutUrlForActiveOrder(fallbackWaitingOrder);
            return {
              orderId: fallbackWaitingOrder._id.toString(),
              checkoutUrl: resolved.checkoutUrl,
              returnUrl: resolved.returnUrl,
              order: resolved.order,
            };
          }
        }
        throw err;
      }
      if (updated) break;
      await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
    }
    if (!updated) {
      log("error", "checkout:lock-failed", {
        orderId: order._id.toString(),
        correlationId,
      });
      throw new Error(
        "Failed to update order state due to concurrent modification",
      );
    }

    log("info", "checkout:payment-created", {
      orderId: order._id.toString(),
      paymentId,
      correlationId,
    });
    return {
      orderId: updated._id.toString(),
      checkoutUrl,
      returnUrl: finalReturnUrl,
      order: updated,
    };
  }

  async getOrderById(orderId, userId) {
    let order = null;
    try {
      if (mongoose.Types.ObjectId.isValid(String(orderId))) {
        const query = { _id: orderId };
        if (userId) query.userId = userId;
        order = await Order.findOne(query);
      } else {
        // fallback: match by paymentId, metadata.paymentId, metadata.orderCode, or idempotencyKey
        const query = {};
        if (userId) query.userId = userId;
        query.$or = [
          { paymentId: String(orderId) },
          { ["metadata.paymentId"]: String(orderId) },
          { ["metadata.orderCode"]: String(orderId) },
          { idempotencyKey: String(orderId) },
        ];
        order = await Order.findOne(query);
      }
    } catch (err) {
      // in case of cast errors or others, fall through to not found
      order = null;
    }
    if (!order) {
      const e = new Error("Order not found");
      e.statusCode = 404;
      throw e;
    }
    // On-demand reconciliation: if order is WAITING_PAYMENT but we haven't
    // processed external payment webhook (e.g., webhooks not delivered), attempt to
    // verify payment status directly and mark PAID when appropriate.
    if (order.status === "WAITING_PAYMENT" && order.paymentId) {
      try {
        const payInfo = await getPaymentStatusFromPaymentService(
          order.paymentId,
        );
        const normalized = String(
          (payInfo && payInfo.status) || "",
        ).toLowerCase();
        if (normalized === "paid" || normalized === "success") {
          // verify amount matches the canonical order total
          const desiredAmount = Math.round(order.totalPrice || 0);
          if (
            typeof payInfo.amount === "undefined" ||
            Number(payInfo.amount) === Number(desiredAmount)
          ) {
            const paymentId = payInfo.paymentId || order.paymentId;
            const cond = {
              _id: order._id,
              status: "WAITING_PAYMENT",
              processedPaymentIds: { $ne: paymentId },
            };
            const update = {
              $set: { status: "PAID", paymentId },
              $inc: { lockVersion: 1 },
            };
            update.$addToSet = { processedPaymentIds: paymentId };
            const updated = await Order.findOneAndUpdate(cond, update, {
              new: true,
            });
            if (updated) {
              // enqueue cart clear
              try {
                await this._publishCartClear(updated);
              } catch (e) {}
              return updated;
            }
          }
        }
      } catch (err) {
        // ignore reconciliation errors and return current order
      }
    }
    return order;
  }

  async getMyOrders(userId) {
    const orders = await Order.find({ userId }).sort({ createdAt: -1 }).lean();

    await Promise.all(
      orders.map(async (order) => {
        if (order.status === "WAITING_PAYMENT" && order.paymentId) {
          try {
            await this.getOrderById(order._id, userId);
          } catch (error) {}
        }
      }),
    );

    return Order.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async getAllOrders() {
    return Order.find({}).sort({ createdAt: -1 }).lean();
  }

  async applyPaymentResult({ orderId, status, paymentId = null }) {
    if (!orderId) {
      const error = new Error("orderId is required");
      error.statusCode = 400;
      throw error;
    }

    const normalizedStatus = String(status || "").toUpperCase();
    if (!normalizedStatus) {
      const error = new Error("status is required");
      error.statusCode = 400;
      throw error;
    }

    const existing = await Order.findById(orderId);
    if (!existing) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    if (normalizedStatus === "PAID" || normalizedStatus === "SUCCESS") {
      if (existing.status === "PAID" || existing.status === "COMPLETED") {
        return existing;
      }

      const update = {
        $set: {
          status: "PAID",
        },
        $inc: { lockVersion: 1 },
      };

      if (paymentId) {
        update.$set.paymentId = String(paymentId);
        update.$set.lastProcessedPaymentId = String(paymentId);
        update.$addToSet = { processedPaymentIds: String(paymentId) };
      }

      const updated = await Order.findOneAndUpdate(
        { _id: orderId, status: { $nin: ["PAID", "COMPLETED"] } },
        update,
        { new: true },
      );

      const finalOrder = updated || (await Order.findById(orderId));
      try {
        await this._publishCartClear(finalOrder);
      } catch (error) {}
      return finalOrder;
    }

    if (normalizedStatus === "FAILED" || normalizedStatus === "CANCELLED") {
      return Order.findOneAndUpdate(
        { _id: orderId, status: { $nin: ["PAID", "COMPLETED"] } },
        {
          $set: {
            status: "FAILED",
            ...(paymentId ? { paymentId: String(paymentId) } : {}),
          },
          $inc: { lockVersion: 1 },
        },
        { new: true },
      );
    }

    return existing;
  }

  // External payment webhook handling removed from Order Service - handled by Payment Service

  // Reconcile waiting payments; processes in batches with cursor + delay to avoid overload.
  // Options: { batchSize, batchDelayMs, maxBatches, startAfterId, correlationId }
  async reconcilePayments(opts = {}) {
    const {
      batchSize = 100,
      batchDelayMs = 200,
      maxBatches = 0, // 0 = unlimited
      startAfterId = null,
      correlationId = null,
    } = typeof opts === "number" ? { batchSize: opts } : opts;

    log("info", "reconcile:start", {
      correlationId,
      batchSize,
      batchDelayMs,
      maxBatches,
    });
    let lastId = startAfterId;
    let batches = 0;
    let processed = 0;
    while (true) {
      if (maxBatches && batches >= maxBatches) break;
      // include WAITING_PAYMENT and recently-attempted FAILED orders (allow resurrection)
      const recentWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const query = {
        $or: [
          { status: "WAITING_PAYMENT" },
          { status: "FAILED", paymentAttemptedAt: { $gte: recentWindow } },
        ],
      };
      if (lastId) query._id = { $gt: lastId };
      const orders = await Order.find(query).sort({ _id: 1 }).limit(batchSize);
      if (!orders || orders.length === 0) break;
      for (const order of orders) {
        try {
          if (!order.paymentId) {
            log("warn", "reconcile:no-paymentId", {
              orderId: order._id.toString(),
              correlationId,
            });
            continue;
          }

          const statusResp = await retryWithBackoff(
            () => getPaymentStatusFromPaymentService(order.paymentId),
            {
              retries: 2,
              baseDelay: 300,
              onRetry: (a, err) =>
                log("warn", "reconcile:payment-service-retry", {
                  orderId: order._id.toString(),
                  attempt: a,
                  error: err.message,
                  correlationId,
                }),
            },
          );
          const status = (statusResp && statusResp.status) || statusResp;
          log("info", "reconcile:payment-status", {
            orderId: order._id.toString(),
            paymentId: order.paymentId,
            status,
            correlationId,
          });

          const mappedStatus = paymentStatusToOrderStatus(status);
          if (mappedStatus === "PAID") {
            const updated = await Order.findOneAndUpdate(
              {
                _id: order._id,
                status: "WAITING_PAYMENT",
                processedPaymentIds: { $ne: order.paymentId },
              },
              {
                $addToSet: { processedPaymentIds: order.paymentId },
                $set: { status: "PAID" },
                $inc: { lockVersion: 1 },
              },
              { new: true },
            );
            if (updated) {
              try {
                const claimed = await this._publishCartClear(updated);
                if (claimed) {
                  log("info", "reconcile:clear-cart-enqueued", {
                    orderId: claimed._id.toString(),
                    correlationId,
                  });
                }
              } catch (err) {
                log("warn", "reconcile:clear-cart-enqueue-failed", {
                  orderId: updated._id.toString(),
                  error: err.message,
                  correlationId,
                });
              }
              try {
                await eventBus.publish("OrderPaid", {
                  orderId: updated._id.toString(),
                  paymentId: updated.paymentId,
                  correlationId,
                });
              } catch (e) {
                log("warn", "reconcile:event-publish-failed", {
                  orderId: updated._id.toString(),
                  paymentId: updated.paymentId,
                  correlationId,
                  error: e.message,
                });
              }
            }
          } else if (mappedStatus === "FAILED") {
            await Order.findOneAndUpdate(
              { _id: order._id, status: "WAITING_PAYMENT" },
              { $set: { status: "FAILED" }, $inc: { lockVersion: 1 } },
            );
            try {
              await eventBus.publish("OrderFailed", {
                orderId: order._id.toString(),
                paymentId: order.paymentId,
                correlationId,
              });
            } catch (e) {
              log("warn", "reconcile:event-publish-failed", {
                orderId: order._id.toString(),
                paymentId: order.paymentId,
                correlationId,
                error: e.message,
              });
            }
          } else {
            // still pending
          }
        } catch (err) {
          log("error", "reconcile:error", {
            orderId: order._id.toString(),
            error: err.message,
            correlationId,
          });
        }
        processed += 1;
        try {
          metrics.inc("reconcile_processed");
        } catch (e) {}
        lastId = order._id;
      }
      batches += 1;
      // delay between batches
      await new Promise((r) => setTimeout(r, batchDelayMs));
    }
    log("info", "reconcile:done", { processed, batches, correlationId });
    return { processed, batches };
  }

  // Expire orders where paymentExpiresAt has passed: mark them FAILED and emit OrderFailed
  async expirePendingPayments(opts = {}) {
    const { batchSize = 100, correlationId = null } = opts;
    const now = new Date();
    const toExpire = await Order.find({
      status: "WAITING_PAYMENT",
      paymentExpiresAt: { $lte: now },
    })
      .limit(batchSize)
      .lean();
    for (const o of toExpire) {
      try {
        await Order.findOneAndUpdate(
          { _id: o._id, status: "WAITING_PAYMENT" },
          { $set: { status: "FAILED" }, $inc: { lockVersion: 1 } },
        );
        try {
          await eventBus.publish("OrderFailed", {
            orderId: o._id.toString(),
            paymentId: o.paymentId,
            correlationId,
            reason: "payment_expired",
          });
        } catch (e) {
          log("warn", "expire:event-publish-failed", {
            orderId: o._id.toString(),
            error: e.message,
            correlationId,
          });
        }
      } catch (err) {
        log("error", "expire:error", {
          orderId: o._id.toString(),
          error: err.message,
          correlationId,
        });
      }
    }
    return { expired: toExpire.length };
  }

  async cleanupStaleWaitingPayments(opts = {}) {
    const {
      batchSize = 100,
      correlationId = null,
      staleAfterMs = Number(process.env.PAYMENT_STALE_ORDER_MS || 15 * 60 * 1000),
    } = opts;
    const now = new Date();
    const candidates = await Order.find({
      status: { $in: ["PENDING", "WAITING_PAYMENT"] },
    })
      .sort({ createdAt: 1 })
      .limit(batchSize)
      .lean();

    let refreshed = 0;
    let expired = 0;

    for (const order of candidates) {
      try {
        const paymentExpiresAt =
          order.paymentExpiresAt && !Number.isNaN(Date.parse(order.paymentExpiresAt))
            ? new Date(order.paymentExpiresAt)
            : null;
        const createdAt =
          order.createdAt && !Number.isNaN(Date.parse(order.createdAt))
            ? new Date(order.createdAt)
            : now;
        const isExpired = paymentExpiresAt
          ? paymentExpiresAt.getTime() <= now.getTime()
          : now.getTime() - createdAt.getTime() >= staleAfterMs;
        const isStalePending =
          order.status === "PENDING" &&
          now.getTime() - createdAt.getTime() >= staleAfterMs;

        let providerCheckoutUrl = null;
        let paymentInfo = null;

        if (!isExpired && !isStalePending && order.paymentId) {
          try {
            paymentInfo = await getPaymentStatusFromPaymentService(order.paymentId);
            if (paymentInfo && isValidCheckoutUrl(paymentInfo.checkoutUrl)) {
              providerCheckoutUrl = String(paymentInfo.checkoutUrl).trim();
            }
          } catch (error) {
            log("warn", "cleanup:payment-lookup-failed", {
              orderId: order._id.toString(),
              paymentId: order.paymentId,
              correlationId,
              error: error.message,
            });
          }
        }

        if (providerCheckoutUrl && !isStalePending) {
          const currentCheckoutUrl =
            order.metadata && typeof order.metadata.checkoutUrl === "string"
              ? order.metadata.checkoutUrl
              : null;

          if (currentCheckoutUrl !== providerCheckoutUrl) {
            await Order.findOneAndUpdate(
              { _id: order._id, status: "WAITING_PAYMENT" },
              {
                $set: {
                  metadata: Object.assign({}, order.metadata || {}, {
                    checkoutUrl: providerCheckoutUrl,
                    paymentAmount:
                      typeof paymentInfo.amount !== "undefined"
                        ? paymentInfo.amount
                        : order.totalPrice,
                  }),
                },
              },
            );
            refreshed += 1;
          }
          continue;
        }

        await Order.findOneAndUpdate(
          { _id: order._id, status: { $in: ["PENDING", "WAITING_PAYMENT"] } },
          {
            $set: { status: "FAILED" },
            $unset: {
              paymentId: "",
              paymentExpiresAt: "",
              metadata: "",
            },
            $inc: { lockVersion: 1 },
          },
        );

        try {
          await eventBus.publish("OrderFailed", {
            orderId: order._id.toString(),
            paymentId: order.paymentId,
            correlationId,
            reason: isExpired || isStalePending ? "payment_expired" : "stale_checkout_link",
          });
        } catch (error) {
          log("warn", "cleanup:event-publish-failed", {
            orderId: order._id.toString(),
            error: error.message,
            correlationId,
          });
        }
        expired += 1;
      } catch (error) {
        log("error", "cleanup:error", {
          orderId: order._id.toString(),
          error: error.message,
          correlationId,
        });
      }
    }

    log("info", "cleanup:done", {
      refreshed,
      expired,
      correlationId,
    });
    return { refreshed, expired };
  }
}

const service = new OrderService();
service.eventBus = eventBus;
module.exports = service;
