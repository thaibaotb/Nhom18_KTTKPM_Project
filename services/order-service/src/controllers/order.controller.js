const { orderCheckoutService } = require("../services/order.checkout.service");

async function createOrder(req, res, next) {
  try {
    const userId = req.body && req.body.userId;
    const order = await orderCheckoutService.createOrder(userId);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

async function checkout(req, res, next) {
  return createOrder(req, res, next);
}

async function getOrder(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user && req.user.userId;
    const order = await orderCheckoutService.getOrderById(id, userId);
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

async function getMyOrders(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const orders = await orderCheckoutService.getMyOrders(userId);
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

async function getAllOrders(req, res, next) {
  try {
    const user = req.user || {};
    if (!user.role || user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const orders = await orderCheckoutService.getAllOrders();
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

async function payosWebhook(req, res, next) {
  try {
    await orderCheckoutService.handlePayOsWebhook(
      req.rawBody,
      req.headers["x-payos-signature"] || "",
    );
    res.status(200).json({ success: true, message: "Webhook received" });
  } catch (err) {
    if (!res.headersSent) {
      next(err);
    } else {
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "error",
          event: "webhook:unexpected-error",
          error: err.message,
        }),
      );
    }
  }
}

module.exports = {
  createOrder,
  checkout,
  getOrder,
  getMyOrders,
  getAllOrders,
  payosWebhook,
};
