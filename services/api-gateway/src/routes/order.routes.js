const router = require("express").Router();
const {
  createCartProxyMiddleware,
  createOrderProxyMiddleware,
  createWebhookProxyMiddleware,
} = require("../services/orderProxy.service");
const authMiddleware = require("../middlewares/auth.middleware");

const proxyToCart = createCartProxyMiddleware();
const proxyToOrder = createOrderProxyMiddleware();
const proxyToWebhook = createWebhookProxyMiddleware();

// Cart routes
router.get("/cart", authMiddleware(["user", "admin"]), proxyToCart);
router.post("/cart/items", authMiddleware(["user", "admin"]), proxyToCart);
router.put(
  "/cart/items/:itemId",
  authMiddleware(["user", "admin"]),
  proxyToCart,
);
router.delete(
  "/cart/items/:itemId",
  authMiddleware(["user", "admin"]),
  proxyToCart,
);
router.delete("/cart/clear", authMiddleware(["user", "admin"]), proxyToCart);

// Order routes - pass token through without verifying at gateway level
// order-service's own userFromHeader middleware reads X-User-Payload
router.post("/checkout", proxyToOrder);
router.post("/orders", proxyToOrder);
router.post("/orders/:id/confirm-payment-return", proxyToOrder);
router.get("/orders", authMiddleware(["admin"]), proxyToOrder);
router.get("/orders/me", proxyToOrder);
router.get("/orders/:id", proxyToOrder);

// Webhook - public
router.post("/webhooks/payos", proxyToWebhook);

module.exports = router;
