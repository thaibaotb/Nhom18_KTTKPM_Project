const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || "development";
const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const productServiceUrl =
  process.env.PRODUCT_SERVICE_URL || "http://localhost:3002";
const aiAgentServiceUrl =
  process.env.AI_AGENT_SERVICE_URL || "http://localhost:3010";
const cartServiceUrl = process.env.CART_SERVICE_URL || "http://localhost:3003";
const orderServiceUrl =
  process.env.ORDER_SERVICE_URL || "http://localhost:3004";
const paymentServiceUrl =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:5003";
const jwtSecret = process.env.JWT_SECRET || "change_me_in_dev";

module.exports = {
  port,
  nodeEnv,
  authServiceUrl,
  productServiceUrl,
  aiAgentServiceUrl,
  cartServiceUrl,
  orderServiceUrl,
  paymentServiceUrl,
  jwtSecret,
};
