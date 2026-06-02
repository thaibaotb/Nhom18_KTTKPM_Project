function logPaymentEvent(event, data = {}) {
  const out = Object.assign(
    { service: "payment-service", event, timestamp: new Date().toISOString() },
    data,
  );
  try {
    console.log(JSON.stringify(out));
  } catch (e) {
    console.log(out);
  }
}

module.exports = { logPaymentEvent };
