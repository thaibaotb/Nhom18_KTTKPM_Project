const router = require("express").Router();
const ctrl = require("../controllers/order.controller");

router.post("/payos", ctrl.payosWebhook);
router.post("/webhook/payos", ctrl.payosWebhook);

module.exports = router;
