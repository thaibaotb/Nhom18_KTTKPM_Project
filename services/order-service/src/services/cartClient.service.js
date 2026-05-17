const { CartServiceClient, cartServiceClient } = require("./cart.client");

async function getCartByUser(userId) {
  return cartServiceClient.getCart(userId);
}

async function clearCart(userId, expectedVersion) {
  return cartServiceClient.clearCart(userId, expectedVersion);
}

module.exports = {
  CartServiceClient,
  cartServiceClient,
  getCartByUser,
  getCart: getCartByUser,
  clearCart,
};
