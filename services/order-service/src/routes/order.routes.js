const router = require("express").Router();
const ctrl = require("../controllers/order.controller");
const userFromHeader = require("../middlewares/userFromHeader");

router.post("/", ctrl.createOrder);
router.post("/checkout", ctrl.checkout);
router.get("/", userFromHeader, ctrl.getAllOrders);
router.get("/me", userFromHeader, ctrl.getMyOrders);
router.get("/:id", userFromHeader, ctrl.getOrder);

module.exports = router;
