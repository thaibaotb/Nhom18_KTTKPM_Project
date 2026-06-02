const metrics = {
  totalOutboxProcessed: 0,
  totalOutboxSuccess: 0,
  totalOutboxFailed: 0,
  totalRetries: 0,
};

module.exports = {
  inc: (key, v = 1) => {
    if (typeof metrics[key] === "number") metrics[key] += v;
  },
  get: () => Object.assign({}, metrics),
};
