const axios = require("axios");
const { cartServiceUrl } = require("../config/env");

function unwrapResponseData(resp) {
  if (!resp || typeof resp !== "object") return null;
  if (resp.data && Object.prototype.hasOwnProperty.call(resp.data, "data")) {
    return resp.data.data;
  }
  return resp.data ?? null;
}

class CartServiceClient {
  constructor(baseURL = cartServiceUrl) {
    this.client = axios.create({ baseURL, timeout: 5000 });
  }

  async getCart(userId) {
    const resp = await this.client.get("/cart", {
      headers: { "X-User-Payload": JSON.stringify({ userId }) },
    });
    return unwrapResponseData(resp);
  }

  async clearCart(userId, expectedVersion) {
    const resp = await this.client.delete("/cart/clear", {
      headers: { "X-User-Payload": JSON.stringify({ userId }) },
      data:
        typeof expectedVersion === "undefined"
          ? undefined
          : { expectedVersion },
    });

    const data = unwrapResponseData(resp);
    if (!data || resp.data?.cleared === false) {
      return null;
    }
    return data;
  }
}

const cartServiceClient = new CartServiceClient();

module.exports = {
  CartServiceClient,
  cartServiceClient,
};
