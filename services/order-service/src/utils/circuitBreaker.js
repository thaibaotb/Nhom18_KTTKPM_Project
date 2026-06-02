class CircuitBreaker {
  constructor(fn, opts = {}) {
    this.fn = fn;
    this.failureThreshold = opts.failureThreshold || 5; // failures to open
    this.resetTimeout = opts.resetTimeout || 30000; // ms
    this.state = "CLOSED";
    this.failureCount = 0;
    this.nextAttempt = 0;
  }

  async fire(...args) {
    if (this.state === "OPEN") {
      if (Date.now() > this.nextAttempt) {
        this.state = "HALF";
      } else {
        const err = new Error("Circuit is open");
        err.code = "EOPEN";
        throw err;
      }
    }

    try {
      const result = await this.fn(...args);
      this.success();
      return result;
    } catch (err) {
      this.failure();
      throw err;
    }
  }

  success() {
    this.failureCount = 0;
    if (this.state === "HALF") this.state = "CLOSED";
  }

  failure() {
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
}

module.exports = CircuitBreaker;
