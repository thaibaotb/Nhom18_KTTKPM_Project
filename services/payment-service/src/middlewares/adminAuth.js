const { adminSecret } = require("../config/env");

module.exports = function adminAuth(req, res, next) {
  const secret = req.headers["x-admin-secret"];
  if (!adminSecret || adminSecret === "change-me-admin") {
    return res
      .status(500)
      .json({ success: false, message: "Admin auth not configured" });
  }
  if (!secret || secret !== adminSecret) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  next();
};
