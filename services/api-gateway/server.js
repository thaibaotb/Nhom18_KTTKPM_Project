require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const { port } = require("./src/config/env");
const loggerMiddleware = require("./src/middlewares/logger");
const errorHandlerMiddleware = require("./src/middlewares/errorHandler");
const correlationMiddleware = require("./src/middlewares/correlation.middleware");
const healthRoutes = require("./src/routes/health.routes");
const authRoutes = require("./src/routes/auth.routes");
const productRoutes = require("./src/routes/product.routes");
const categoryRoutes = require("./src/routes/category.routes");
const aiRoutes = require("./src/routes/ai.routes");
const chatRoutes = require("./src/routes/chat.routes");
const orderRoutes = require("./src/routes/order.routes");
const paymentRoutes = require("./src/routes/payment.routes");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Correlation-ID",
      "X-Requested-With",
    ],
  }),
);

// --- Rate Limiters ---


// Strict limiter for authentication (login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes',
    data: null,
    errorCode: 'TOO_MANY_AUTH_ATTEMPTS'
  }
});

// // Normal limiter for general API routes
// const defaultLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   keyGenerator: (req) => {
//     // Identity-based rate limiting (UserId + IP)
//     return req.user ? `${req.user.id}-${req.ip}` : req.ip;
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: {
//     success: false,
//     message: 'Too many requests, please slow down',
//     data: null,
//     errorCode: 'RATE_LIMIT_EXCEEDED'
//   }
// });


// --- Middlewares & Routes ---

app.use(correlationMiddleware);
app.use(loggerMiddleware);

// app.use('/api/auth', authLimiter, authRoutes);
app.use("/api/auth", authLimiter,authRoutes);

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api", orderRoutes);
app.use("/api", paymentRoutes);

app.get("/test", (req, res) => res.json({ message: "Gateway is reachable" }));

// Standard 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    data: null,
    errorCode: "ROUTE_NOT_FOUND",
  });
});

app.use(errorHandlerMiddleware);

app.listen(port, () => {
  console.log(`api-gateway listening on port ${port}`);
});
