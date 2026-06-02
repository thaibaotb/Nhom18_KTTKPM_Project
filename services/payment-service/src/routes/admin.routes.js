const router = require("express").Router();
const ctrl = require("../controllers/admin.controller");
const adminAuth = require("../middlewares/adminAuth");

router.get("/admin/outbox", adminAuth, ctrl.listOutbox);
router.post("/admin/outbox/:id/retry", adminAuth, ctrl.retryOutbox);
router.post("/admin/outbox/retry-all", adminAuth, ctrl.retryAll);
router.get("/admin/outbox/stats", adminAuth, ctrl.outboxStats);

module.exports = router;
