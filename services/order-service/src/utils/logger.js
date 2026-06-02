function baseLog(fields) {
  const out = Object.assign(
    { service: "order-service", ts: new Date().toISOString() },
    fields,
  );
  try {
    console.log(JSON.stringify(out));
  } catch (e) {
    console.log(out);
  }
}

module.exports = {
  info: (msg, meta = {}) =>
    baseLog(Object.assign({ level: "info", message: msg }, meta)),
  warn: (msg, meta = {}) =>
    baseLog(Object.assign({ level: "warn", message: msg }, meta)),
  error: (msg, meta = {}) =>
    baseLog(Object.assign({ level: "error", message: msg }, meta)),
};
