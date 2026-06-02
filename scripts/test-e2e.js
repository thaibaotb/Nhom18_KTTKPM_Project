const { sendFakeWebhook } = require("./fakeWebhook");

const gatewayUrl = process.env.GATEWAY_URL || "http://localhost:3000";
const orderServiceUrl =
  process.env.ORDER_SERVICE_URL || "http://localhost:3010";
const paymentServiceUrl =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:5003";
const userId = process.env.E2E_USER_ID || "user-e2e-payment-test";

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `Request failed ${response.status} for ${url}: ${JSON.stringify(data)}`,
    );
  }
  return data;
}

async function main() {
  console.log("[FLOW] ORDER_CREATED", { step: "start" });
  const orderResponse = await requestJson(`${gatewayUrl}/api/checkout`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  const order = orderResponse.data;
  console.log("[FLOW] ORDER_CREATED", {
    orderId: order._id,
    totalPrice: order.totalPrice,
  });

  console.log("[FLOW] PAYMENT_CREATED", { step: "start" });
  const paymentResponse = await requestJson(`${gatewayUrl}/api/payments`, {
    method: "POST",
    body: JSON.stringify({
      orderId: order._id,
      amount: order.totalPrice,
      description: `Order ${order._id}`,
    }),
  });
  const payment = paymentResponse.data;
  console.log("[FLOW] PAYMENT_CREATED", {
    orderId: payment.orderId,
    paymentLinkId: payment.paymentLinkId,
    checkoutUrl: payment.checkoutUrl,
  });

  console.log("[FLOW] WEBHOOK_TRIGGERED", { orderCode: payment.paymentLinkId });
  const webhookFirst = await sendFakeWebhook({
    orderCode: payment.paymentLinkId,
    status: "PAID",
  });
  const webhookSecond = await sendFakeWebhook({
    orderCode: payment.paymentLinkId,
    status: "PAID",
  });

  console.log("[FLOW] WEBHOOK_TRIGGERED", {
    firstStatus: webhookFirst?.data?.status,
    secondStatus: webhookSecond?.data?.status,
  });

  const orderStateResponse = await fetch(
    `${orderServiceUrl}/orders/${order._id}`,
    {
      headers: {
        "X-User-Payload": JSON.stringify({ userId }),
      },
    },
  );
  const orderState = await orderStateResponse.json();
  if (!orderStateResponse.ok) {
    throw new Error(`Order verification failed: ${JSON.stringify(orderState)}`);
  }

  console.log("[FLOW] ORDER_UPDATED", {
    orderId: order._id,
    orderStatus: orderState.data.status,
    paymentStatus: webhookFirst?.data?.status,
  });

  if (webhookFirst?.data?.status !== "PAID") {
    throw new Error("Payment status was not PAID after webhook");
  }
  if (orderState.data.status !== "SUCCESS") {
    throw new Error(`Order status was not SUCCESS: ${orderState.data.status}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        orderId: order._id,
        paymentLinkId: payment.paymentLinkId,
        orderStatus: orderState.data.status,
        paymentStatus: webhookFirst?.data?.status,
      },
      null,
      2,
    ),
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main };
