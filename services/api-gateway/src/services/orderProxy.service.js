const { createProxyMiddleware } = require("http-proxy-middleware");

const cartServiceUrl = process.env.CART_SERVICE_URL || "http://localhost:3003";
const orderServiceUrl =
  process.env.ORDER_SERVICE_URL || "http://localhost:3004";
const paymentServiceUrl =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:5003";

function createCartProxyMiddleware() {
  return createProxyMiddleware({
    target: cartServiceUrl,
    changeOrigin: true,
    logLevel: "debug", // Increased log level for debugging
    timeout: 10000,
    proxyTimeout: 10000,
    pathRewrite: {
      "^/api/cart": "/cart",
      "^/cart": "/cart",
    },
    onProxyReq: (proxyReq, req) => {
      if (req.correlationId)
        proxyReq.setHeader("X-Correlation-ID", req.correlationId);
      if (req.user)
        proxyReq.setHeader("X-User-Payload", JSON.stringify(req.user));
      console.log(
        `[proxy:cart] ${req.method} ${req.originalUrl} (path: ${req.url}) -> ${cartServiceUrl}${proxyReq.path}`,
      );
    },
    onError: (err, req, res) => {
      console.error("[cart-proxy error]", err.message);
      if (!res.headersSent) {
        res
          .status(503)
          .json({
            success: false,
            message: "Cart Service Unavailable",
            data: null,
            errorCode: "SERVICE_UNAVAILABLE",
          });
      }
    },
  });
}

function createOrderProxyMiddleware() {
  return createProxyMiddleware({
    target: orderServiceUrl,
    changeOrigin: true,
    logLevel: "debug",
    timeout: 15000,
    proxyTimeout: 15000,
    pathRewrite: {
      "^/api/checkout": "/orders/checkout",
      "^/api/orders": "/orders",
      "^/checkout": "/orders/checkout",
      "^/orders": "/orders",
    },
    onProxyReq: (proxyReq, req) => {
      if (req.correlationId)
        proxyReq.setHeader("X-Correlation-ID", req.correlationId);
      if (req.user)
        proxyReq.setHeader("X-User-Payload", JSON.stringify(req.user));

      const authHeader = req.headers["authorization"];
      if (authHeader) proxyReq.setHeader("Authorization", authHeader);

      console.log(
        `[proxy:order] ${req.method} ${req.originalUrl} (path: ${req.url}) -> ${orderServiceUrl}${proxyReq.path}`,
      );
    },
    onError: (err, req, res) => {
      console.error("[order-proxy error]", err.message);
      if (!res.headersSent) {
        res
          .status(503)
          .json({
            success: false,
            message: "Order Service Unavailable",
            data: null,
            errorCode: "SERVICE_UNAVAILABLE",
          });
      }
    },
  });
}

function createWebhookProxyMiddleware() {
  return createProxyMiddleware({
    target: orderServiceUrl,
    changeOrigin: true,
    logLevel: "debug",
    timeout: 10000,
    proxyTimeout: 10000,
    pathRewrite: {
      "^/api/webhooks": "/webhooks",
      "^/webhooks": "/webhooks",
    },
    onError: (err, req, res) => {
      console.error("[webhook-proxy error]", err.message);
      if (!res.headersSent)
        res
          .status(503)
          .json({ success: false, message: "Service Unavailable" });
    },
  });
}

function createPaymentProxyMiddleware() {
  return createProxyMiddleware({
    target: paymentServiceUrl,
    changeOrigin: true,
    logLevel: "debug",
    timeout: 15000,
    proxyTimeout: 15000,
    pathRewrite: {
      "^/api/payments": "/payments",
      "^/payments": "/payments",
      "^/api/payments/webhook": "/payments/webhook",
      "^/payments/webhook": "/payments/webhook",
    },
    onProxyReq: (proxyReq, req) => {
      if (req.correlationId)
        proxyReq.setHeader("X-Correlation-ID", req.correlationId);
      if (req.user)
        proxyReq.setHeader("X-User-Payload", JSON.stringify(req.user));
      const authHeader = req.headers["authorization"];
      if (authHeader) proxyReq.setHeader("Authorization", authHeader);
      console.log(
        `[proxy:payment] ${req.method} ${req.originalUrl} (path: ${req.url}) -> ${paymentServiceUrl}${proxyReq.path}`,
      );
    },
    onError: (err, req, res) => {
      console.error("[payment-proxy error]", err.message);
      if (!res.headersSent) {
        res
          .status(503)
          .json({
            success: false,
            message: "Payment Service Unavailable",
            data: null,
            errorCode: "SERVICE_UNAVAILABLE",
          });
      }
    },
  });
}

module.exports = {
  createCartProxyMiddleware,
  createOrderProxyMiddleware,
  createWebhookProxyMiddleware,
  createPaymentProxyMiddleware,
};
