const Outbox = require("../models/outbox.model");
const metrics = require("../utils/metrics");
const { logPaymentEvent } = require("../utils/logger");

async function listOutbox(req, res, next) {
  try {
    const status = req.query.status;
    const limit = Math.min(100, Number(req.query.limit || 20));
    const page = Math.max(0, Number(req.query.page || 0));
    const filter = {};
    if (status) filter.status = status;
    const docs = await Outbox.find(filter)
      .sort({ nextRetryAt: 1 })
      .skip(page * limit)
      .limit(limit)
      .lean();
    res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
}

async function retryOutbox(req, res, next) {
  try {
    const id = req.params.id;
    const doc = await Outbox.findById(id);
    if (!doc)
      return res.status(404).json({ success: false, message: "not found" });
    await Outbox.findByIdAndUpdate(id, {
      $set: { retryCount: 0, status: "PENDING", nextRetryAt: new Date() },
    });
    logPaymentEvent("OUTBOX:ADMIN_RETRY", { id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function retryAll(req, res, next) {
  try {
    const result = await Outbox.updateMany(
      { status: "FAILED" },
      {
        $set: {
          status: "PENDING",
          retryCount: 0,
          nextRetryAt: new Date(),
          lastError: null,
        },
      },
    );
    logPaymentEvent("OUTBOX:ADMIN_RETRY_ALL", {
      matched: result.n || result.matchedCount,
      modified: result.nModified || result.modifiedCount,
    });
    return res.json({
      success: true,
      retried: result.nModified || result.modifiedCount || 0,
    });
  } catch (err) {
    next(err);
  }
}

async function outboxStats(req, res, next) {
  try {
    const total = await Outbox.countDocuments({});
    const pending = await Outbox.countDocuments({ status: "PENDING" });
    const sent = await Outbox.countDocuments({ status: "SENT" });
    const failed = await Outbox.countDocuments({ status: "FAILED" });
    res.json({
      success: true,
      data: { total, pending, sent, failed, metrics: metrics.get() },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listOutbox, retryOutbox, retryAll, outboxStats };
