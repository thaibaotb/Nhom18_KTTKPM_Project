const { internalServiceSecret } = require("../config/env");

module.exports = function internalAuth(req, res, next) {
  const secret = req.headers["x-internal-secret"];
  if (!internalServiceSecret || internalServiceSecret === "change-me") {
    // If not configured, reject to avoid silent unsecured behavior
    return res
      .status(500)
      .json({ success: false, message: "Internal auth not configured" });
  }
  if (!secret || secret !== internalServiceSecret) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
};
