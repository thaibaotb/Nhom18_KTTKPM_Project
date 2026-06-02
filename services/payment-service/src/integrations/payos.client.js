const crypto = require("crypto");
const axios = require("axios");
const {
  payosClientId,
  payosApiKey,
  payosChecksumKey,
  payosApiUrl,
  payosReturnUrl,
  payosCancelUrl,
} = require("../config/env");

function buildSignature(payload) {
  return crypto
    .createHmac("sha256", payosChecksumKey || "change-me")
    .update(payload)
    .digest("hex");
}

function buildCheckoutUrl(paymentLinkId) {
  if (!paymentLinkId) return null;
  return `https://pay.payos.vn/web/${encodeURIComponent(String(paymentLinkId))}`;
}

function buildOrderCode(orderId) {
  return crypto.randomInt(10000000, 100000000);
}

function buildPaymentSignature(body) {
  const data = [
    ["amount", body.amount],
    ["cancelUrl", body.cancelUrl],
    ["description", body.description],
    ["orderCode", body.orderCode],
    ["returnUrl", body.returnUrl],
  ]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return buildSignature(data);
}

async function createPaymentLink(data) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const body = {
      orderCode: Number.isFinite(Number(data.orderCode))
        ? Number(data.orderCode)
        : buildOrderCode(data.orderId),
      amount: Number(data.amount),
      description: String(data.description || `Order ${data.orderId}`),
      cancelUrl: String(data.cancelUrl || payosCancelUrl),
      returnUrl: String(data.returnUrl || payosReturnUrl),
    };

    if (payosClientId && payosApiKey && payosChecksumKey) {
      const response = await axios.post(
        `${payosApiUrl.replace(/\/$/, "")}/v2/payment-requests`,
        { ...body, signature: buildPaymentSignature(body) },
        {
          headers: {
            "x-client-id": payosClientId,
            "x-api-key": payosApiKey,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      );

      const providerCode = String(response.data?.code || "");
      if (providerCode === "231" && attempt < maxAttempts) {
        continue;
      }
      if (providerCode && providerCode !== "00") {
        const error = new Error(
          response.data?.desc || "PayOS failed to create payment link",
        );
        error.statusCode = 400;
        error.errorCode = "PAYOS_CREATE_FAILED";
        error.providerCode = providerCode;
        throw error;
      }

      const payload = response.data?.data || response.data || {};
      const paymentLinkId = String(
        payload.paymentLinkId || payload.id || payload.checkoutUrl || "",
      ).trim();
      return {
        paymentLinkId,
        checkoutUrl:
          payload.checkoutUrl ||
          payload.checkout_url ||
          payload.url ||
          payload.paymentLinkUrl ||
          payload.paymentLinkURL ||
          buildCheckoutUrl(paymentLinkId),
        orderCode: String(payload.orderCode || body.orderCode),
      };
    }
  }

  const paymentLinkId = `payos_${body.orderCode}`;
  return {
    paymentLinkId,
    checkoutUrl: buildCheckoutUrl(paymentLinkId),
    orderCode: String(body.orderCode),
  };
}

function verifyWebhookSignature(rawBody, signature) {
  if (!signature || typeof signature !== "string") return false;
  if (!rawBody) return false;

  const payload = Buffer.isBuffer(rawBody)
    ? rawBody.toString("utf8")
    : typeof rawBody === "string"
      ? rawBody
      : JSON.stringify(rawBody);

  const expected = buildSignature(payload);

  try {
    const expectedBuffer = Buffer.from(expected, "hex");
    const signatureBuffer = Buffer.from(signature, "hex");
    if (expectedBuffer.length !== signatureBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    return false;
  }
}

module.exports = {
  createPaymentLink,
  verifyWebhookSignature,
};
