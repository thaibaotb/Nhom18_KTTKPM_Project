require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { port } = require("./src/config/env");
const connectDb = require("./src/config/db");
const orderRoutes = require("./src/routes/order.routes");
const orderService = require("./src/services/order.service");
const errorHandler = require("./src/middlewares/errorHandler");

const app = express();

app.use((req, res, next) => {
  const startedAt = Date.now();
  console.log(
    `[ORDER_SERVICE] [REQUEST] [START] method=${req.method} path=${req.originalUrl}`,
  );
  res.on("finish", () => {
    console.log(
      `[ORDER_SERVICE] [REQUEST] [DONE] method=${req.method} path=${req.originalUrl} status=${res.statusCode} durationMs=${Date.now() - startedAt}`,
    );
  });
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "order-service" });
});

const internalAuth = require("./src/middlewares/internalAuth");
app.post("/internal/payment-success", internalAuth, (req, res, next) => {
  const ctrl = require("./src/controllers/order.controller");
  return ctrl.internalPaymentSuccess(req, res, next);
});

app.use("/orders", orderRoutes);
// External payment webhooks are handled by Payment Service; Order Service only exposes internal callbacks

app.use(errorHandler);

connectDb()
  .then(async () => {
    try {
      await orderService.cleanupStaleWaitingPayments({ batchSize: 500 });
      await orderService.expirePendingPayments({ batchSize: 500 });
    } catch (error) {
      console.error("Order cleanup failed", error);
    }

    app.listen(port, () => console.log(`Order Service listening on ${port}`));
  })
  .catch((err) => {
    console.error("DB connection failed", err);
    process.exit(1);
  });
