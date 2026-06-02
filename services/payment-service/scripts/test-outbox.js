const mongoose = require("mongoose");
const express = require("express");
const Outbox = require("../src/models/outbox.model");
const worker = require("../src/workers/outbox.worker");
const env = require("../src/config/env");

async function run() {
  process.env.MONGO_URI = process.env.MONGO_URI || env.mongoUri;
  await mongoose.connect(process.env.MONGO_URI, {});

  // start a small server to receive callbacks
  const app = express();
  app.use(express.json());

  // toggle behavior by query param
  const behaveOk = process.argv.includes("--ok");

  app.post("/internal/payment-success", (req, res) => {
    if (behaveOk) return res.status(200).json({ success: true });
    return res.status(500).json({ success: false });
  });

  const server = app.listen(0, async () => {
    const port = server.address().port;
    console.log("Test server listening on", port);

    // set ORDER_SERVICE_URL to test server
    process.env.ORDER_SERVICE_URL = `http://localhost:${port}`;

    // ensure worker picks up new env values by re-requiring config if necessary
    // create pending outbox
    const o = await Outbox.create({
      type: "PAYMENT_SUCCESS",
      payload: {
        orderId: "order-test-" + Date.now(),
        paymentId: "p1",
        status: "PAID",
      },
      status: "PENDING",
      retryCount: 0,
      nextRetryAt: new Date(),
    });
    console.log("Created outbox", o._id);

    try {
      // call worker.processOnce directly
      await worker.processOnce();
      const updated = await Outbox.findById(o._id).lean();
      console.log(
        "After process, outbox status=",
        updated.status,
        "lastError=",
        updated.lastError,
        "retryCount=",
        updated.retryCount,
      );
      await mongoose.disconnect();
      server.close();
      process.exit(0);
    } catch (err) {
      console.error("Worker error", err);
      await mongoose.disconnect();
      server.close();
      process.exit(2);
    }
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
