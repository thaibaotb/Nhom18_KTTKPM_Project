module.exports = {
  port: process.env.PORT || 3010,
  nodeEnv: process.env.NODE_ENV || "development",
  productServiceUrl:
    process.env.PRODUCT_SERVICE_URL || "http://product-service:3002",
  cartServiceUrl: process.env.CART_SERVICE_URL || "http://cart-service:3003",
  paymentServiceUrl:
    process.env.PAYMENT_SERVICE_URL || "http://payment-service:5003",
  internalServiceSecret: process.env.INTERNAL_SERVICE_SECRET || "change-me",
};
