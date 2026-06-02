const Order = require("../models/order.model");
const { cartServiceClient, CartServiceClient } = require("./cart.client");

class BadRequestException extends Error {
  constructor(message) {
    super(message);
    this.name = "BadRequestException";
    this.statusCode = 400;
    this.errorCode = "BAD_REQUEST";
  }
}

class ConflictException extends Error {
  constructor(message) {
    super(message);
    this.name = "ConflictException";
    this.statusCode = 409;
    this.errorCode = "CONFLICT";
  }
}

function calculateTotalPrice(items) {
  return items.reduce((sum, item) => {
    const price = Number(item?.price || 0);
    const quantity = Number(item?.quantity || 0);
    return sum + price * quantity;
  }, 0);
}

class OrderCheckoutService {
  constructor({ orderModel = Order, cartClient = cartServiceClient } = {}) {
    this.orderModel = orderModel;
    this.cartClient = cartClient;
  }

  async createOrder(userId, extraData = {}) {
    if (!userId || !String(userId).trim()) {
      throw new BadRequestException("userId is required");
    }

    console.log("[Checkout] Start", { userId });

    let itemsSnapshot;
    let cartVersion = 0;
    let isDirectItems = false;

    if (Array.isArray(extraData.items) && extraData.items.length > 0) {
      itemsSnapshot = JSON.parse(JSON.stringify(extraData.items));
      cartVersion = Date.now();
      isDirectItems = true;
    } else {
      let cart;
      try {
        cart = await this.cartClient.getCart(userId);
        console.log("[Checkout] Cart fetched", {
          userId,
          cartVersion: cart?.version,
          cartStatus: cart?.status,
        });
      } catch (error) {
        console.log("[Checkout] Failure", {
          userId,
          reason: "cart_fetch_failed",
          error: error.message,
        });
        throw error;
      }

      if (!cart) {
        console.log("[Checkout] Failure", {
          userId,
          reason: "cart_not_found",
        });
        throw new BadRequestException("Cart not found");
      }
      if (!Array.isArray(cart.items) || cart.items.length === 0) {
        console.log("[Checkout] Failure", {
          userId,
          cartVersion: cart?.version,
          reason: "cart_empty",
        });
        throw new BadRequestException("Cart is empty");
      }

      if (cart.status !== "ACTIVE") {
        console.log("[Checkout] Conflict", {
          userId,
          cartVersion: cart?.version,
          reason: "cart_not_active",
          cartStatus: cart.status,
        });
        throw new ConflictException("Checkout conflict");
      }

      cartVersion = Number(cart.version);
      itemsSnapshot = JSON.parse(JSON.stringify(cart.items));

      let clearResult;
      try {
        clearResult = await this.cartClient.clearCart(userId, cart.version);
      } catch (error) {
        console.log("[Checkout] Conflict", {
          userId,
          cartVersion,
          reason: "clear_cart_error",
          error: error.message,
        });
        throw new ConflictException("Checkout conflict");
      }
      console.log("[Checkout] Cart cleared", {
        userId,
        cartVersion,
        cleared: !!clearResult,
      });

      if (!clearResult) {
        console.log("[Checkout] Conflict", {
          userId,
          cartVersion,
          reason: "clear_cart_conflict",
        });
        throw new ConflictException("Checkout conflict");
      }
    }

    // Idempotency key is (userId, cartVersion). If already processed, return it.
    // Skip idempotency check for direct-items (COD) orders since each is unique.
    if (!isDirectItems) {
      const existingOrder = await this.orderModel.findOne({
        userId,
        cartVersion,
      });
      if (existingOrder) {
        console.log("[Checkout] Idempotency hit", {
          userId,
          cartVersion,
          orderId: existingOrder._id,
        });
        return existingOrder;
      }
    }

    const totalPrice = calculateTotalPrice(itemsSnapshot);

    const orderDocument = {
      userId,
      items: itemsSnapshot,
      totalPrice,
      status: "PENDING",
      cartVersion,
      metadata: extraData.metadata || {},
    };

    // COD / direct-items orders need a unique idempotencyKey to avoid
    // E11000 duplicate key errors on the {userId, idempotencyKey} compound index.
    if (isDirectItems) {
      orderDocument.idempotencyKey = `cod-${userId}-${cartVersion}`;
    }

    let createdOrder;
    try {
      createdOrder = await this.orderModel.create(orderDocument);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicated = await this.orderModel.findOne({
          userId,
          cartVersion,
        });
        if (duplicated) {
          console.log("[Checkout] Idempotency hit", {
            userId,
            cartVersion,
            orderId: duplicated._id,
            source: "duplicate_key",
          });
          return duplicated;
        }
      }
      console.log("[Checkout] Failure", {
        userId,
        cartVersion,
        reason: "order_create_failed",
        error: error.message,
      });
      throw error;
    }

    console.log("[Checkout] Order created", {
      userId,
      cartVersion,
      orderId: createdOrder._id,
    });

    return createdOrder;
  }

  async getOrderById(orderId, userId) {
    const order = await this.orderModel.findOne({ _id: orderId, userId });
    if (!order) {
      throw new BadRequestException("Order not found");
    }
    return order;
  }

  async getMyOrders(userId) {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async getAllOrders() {
    return this.orderModel.find({}).sort({ createdAt: -1 }).lean();
  }

  // External payment webhook handling removed; Payment Service processes webhooks and notifies Order Service via internal callback.

  async handlePaymentSuccess({ orderId, status, paymentId = null }) {
    if (!orderId || !String(orderId).trim()) {
      throw new BadRequestException("orderId is required");
    }

    const normalizedStatus = String(status || "").toUpperCase();
    if (!normalizedStatus) {
      throw new BadRequestException("status is required");
    }

    const nextStatus = normalizedStatus === "PAID" ? "SUCCESS" : "FAILED";
    const existing = await this.orderModel.findById(orderId).lean();
    if (!existing) {
      return null;
    }
    // Idempotency: if we've already processed this paymentId, ignore
    if (
      paymentId &&
      existing.lastProcessedPaymentId &&
      String(existing.lastProcessedPaymentId) === String(paymentId)
    ) {
      console.log("[ORDER_SERVICE] [CALLBACK] [IGNORED] duplicate paymentId", {
        orderId: existing._id.toString(),
        paymentId,
      });
      return existing;
    }
    if (existing.status === "SUCCESS") {
      console.log(
        "[ORDER_SERVICE] [CALLBACK] [IGNORED] order already SUCCESS",
        {
          orderId: existing._id.toString(),
        },
      );
      return existing;
    }
    if (existing.status === "FAILED" && nextStatus === "SUCCESS") {
      console.log(
        "[ORDER_SERVICE] [CALLBACK] [IGNORED] terminal FAILED state",
        {
          orderId: existing._id.toString(),
        },
      );
      return existing;
    }

    const updateDoc = { $set: { status: nextStatus } };
    if (paymentId) updateDoc.$set.lastProcessedPaymentId = String(paymentId);
    const updated = await this.orderModel.findOneAndUpdate(
      { _id: orderId },
      updateDoc,
      { new: true },
    );

    if (!updated) {
      return null;
    }

    console.log("[FLOW] ORDER_UPDATED", {
      orderId: updated._id.toString(),
      status: updated.status,
    });

    return updated;
  }
}

const orderCheckoutService = new OrderCheckoutService({
  orderModel: Order,
  cartClient: cartServiceClient,
});

module.exports = {
  OrderCheckoutService,
  orderCheckoutService,
  BadRequestException,
  ConflictException,
  CartServiceClient,
};
