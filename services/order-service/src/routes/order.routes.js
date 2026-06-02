const router = require("express").Router();
const ctrl = require("../controllers/order.controller");
const userFromHeader = require("../middlewares/userFromHeader");

router.post("/", ctrl.createOrder);
router.post("/checkout", ctrl.checkout);
router.post("/internal/payment-success", ctrl.internalPaymentSuccess);
router.post("/:id/confirm-payment-return", userFromHeader, ctrl.confirmPaymentReturn);
router.get("/", userFromHeader, ctrl.getAllOrders);
router.get("/me", userFromHeader, ctrl.getMyOrders);
router.get("/:id", userFromHeader, ctrl.getOrder);

module.exports = router;
