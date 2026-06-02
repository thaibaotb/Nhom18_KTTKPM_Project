const mongoose = require("mongoose");
const Order = require("../src/models/order.model");
const {
  orderCheckoutService,
} = require("../src/services/order.checkout.service");
const env = require("../src/config/env");

async function run() {
  process.env.MONGO_URI = process.env.MONGO_URI || env.mongoUri;
  await mongoose.connect(process.env.MONGO_URI, {});

  const order = await Order.create({
    userId: "u1",
    items: [],
    totalPrice: 100,
    status: "PENDING",
    cartVersion: 1,
  });
  console.log("Created order", order._id.toString());

  const paymentId = "payment-test-1";
  const first = await orderCheckoutService.handlePaymentSuccess({
    orderId: order._id.toString(),
    status: "PAID",
    paymentId,
  });
  console.log(
    "After first callback:",
    first.status,
    first.lastProcessedPaymentId,
  );
  const second = await orderCheckoutService.handlePaymentSuccess({
    orderId: order._id.toString(),
    status: "PAID",
    paymentId,
  });
  console.log(
    "After second callback (should be ignored):",
    second.status,
    second.lastProcessedPaymentId,
  );

  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
