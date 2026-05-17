const Order = require("../models/order.model");
const { cartServiceClient, CartServiceClient } = require("./cart.client");

class BadRequestException extends Error {
  constructor(message) {
    super(message);
    this.name = "BadRequestException";
    this.statusCode = 400;
  }
}

class ConflictException extends Error {
  constructor(message) {
    super(message);
    this.name = "ConflictException";
    this.statusCode = 409;
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

  async createOrder(userId) {
    if (!userId || !String(userId).trim()) {
      throw new BadRequestException("userId is required");
    }

    console.log("[Checkout] Start", { userId });

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

    const cartVersion = Number(cart.version);

    // Idempotency key is (userId, cartVersion). If already processed, return it.
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

    // Snapshot MUST be a deep clone before clearCart.
    const itemsSnapshot = JSON.parse(JSON.stringify(cart.items));

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

    const totalPrice = calculateTotalPrice(itemsSnapshot);

    const orderDocument = {
      userId,
      items: itemsSnapshot,
      totalPrice,
      status: "PENDING",
      cartVersion,
    };

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

  async handlePayOsWebhook() {
    console.log("[Checkout] Webhook ignored");
    return { ok: true };
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
