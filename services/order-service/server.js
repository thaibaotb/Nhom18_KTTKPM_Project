require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { port } = require("./src/config/env");
const connectDb = require("./src/config/db");
const orderRoutes = require("./src/routes/order.routes");
const webhookRoutes = require("./src/routes/webhook.routes");
const errorHandler = require("./src/middlewares/errorHandler");

const app = express();

// Need raw body for webhook signature verification
app.use(
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/orders", orderRoutes);
app.use("/webhooks", webhookRoutes);

app.use(errorHandler);

connectDb()
  .then(() => {
    app.listen(port, () => console.log(`Order Service listening on ${port}`));
  })
  .catch((err) => {
    console.error("DB connection failed", err);
    process.exit(1);
  });
