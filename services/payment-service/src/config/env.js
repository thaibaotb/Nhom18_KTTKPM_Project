require("dotenv").config();

module.exports = {
  port: Number(process.env.PORT || 5003),
  mongoUri: process.env.MONGO_URI || "mongodb://mongodb:27017/payment_service",
  payosClientId: process.env.PAYOS_CLIENT_ID || "",
  payosApiKey: process.env.PAYOS_API_KEY || "",
  payosChecksumKey:
    process.env.PAYOS_CHECKSUM_KEY || process.env.PAYOS_SECRET || "",
  payosApiUrl: process.env.PAYOS_API_URL || "https://api-merchant.payos.vn",
  payosReturnUrl:
    process.env.PAYOS_RETURN_URL || "http://localhost:5173/payment/return",
  payosCancelUrl:
    process.env.PAYOS_CANCEL_URL ||
    process.env.PAYOS_RETURN_URL ||
    "http://localhost:5173/payment/return",
  orderServiceUrl: process.env.ORDER_SERVICE_URL || "http://localhost:3010",
  internalServiceSecret: process.env.INTERNAL_SERVICE_SECRET || "change-me",
  maxRetries: Number(process.env.MAX_RETRIES || 5),
  backoffBaseMs: Number(process.env.BACKOFF_BASE_MS || 500),
  outboxPollInterval: Number(process.env.OUTBOX_POLL_INTERVAL || 5000),
  adminSecret: process.env.ADMIN_SECRET || "change-me-admin",
};
