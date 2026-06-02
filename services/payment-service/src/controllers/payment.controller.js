const paymentService = require("../services/payment.service");

async function createPaymentController(req, res, next) {
  try {
    const payment = await paymentService.createPayment(req.body || {});
    require("../utils/logger").logPaymentEvent("CREATE_PAYMENT_SUCCESS", {
      orderId: payment.orderId,
      id: payment._id,
    });
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    require("../utils/logger").logPaymentEvent("CREATE_PAYMENT_ERROR", {
      message: error.message,
    });
    next(error);
  }
}

async function webhookController(req, res, next) {
  try {
    const result = await paymentService.handleWebhook({
      payload: req.rawBody || req.body,
      signature: req.headers["x-payos-signature"] || "",
    });
    require("../utils/logger").logPaymentEvent("WEBHOOK_HANDLED", { result });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    require("../utils/logger").logPaymentEvent("WEBHOOK_ERROR", {
      message: error.message,
    });
    next(error);
  }
}

async function getPaymentController(req, res, next) {
  try {
    const id = req.params && req.params.id;
    const payment = await paymentService.getPayment(id);
    if (!payment) {
      require("../utils/logger").logPaymentEvent("GET_PAYMENT_NOT_FOUND", {
        id,
      });
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }
    require("../utils/logger").logPaymentEvent("GET_PAYMENT_SUCCESS", {
      id: payment._id,
    });
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    require("../utils/logger").logPaymentEvent("GET_PAYMENT_ERROR", {
      message: error.message,
    });
    next(error);
  }
}

module.exports = {
  createPaymentController,
  webhookController,
  getPaymentController,
};
