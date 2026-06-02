import { apiRequest } from "./client";

function getCurrentUserId() {
  try {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;

    const parsedUser = JSON.parse(storedUser);
    return parsedUser?.userId || parsedUser?.id || null;
  } catch {
    return null;
  }
}

export const orderApi = {
  checkout: async (items, metadata = {}) => {
    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error("userId is required");
    }

    const returnUrl =
      typeof window !== "undefined" && window.location?.origin
        ? `${window.location.origin}/payment/return`
        : "http://localhost:5173/payment/return";

    try {
      const response = await apiRequest("/api/checkout", {
        method: "POST",
        body: JSON.stringify({ userId, items, returnUrl, metadata }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || result?.error || "Checkout failed");
      }
      return result;
    } catch (error) {
      throw error;
    }
  },
  createDirectOrder: async (items, metadata = {}) => {
    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error("userId is required");
    }

    try {
      const response = await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify({ userId, items, metadata }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || result?.error || "Đặt hàng thất bại");
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  getOrder: async (id) => {
    try {
      const response = await apiRequest(`/api/orders/${id}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || result?.error || "Get order failed");
      }
      return result;
    } catch (error) {
      throw error;
    }
  },
  confirmPaymentReturn: async (id, payload) => {
    try {
      const response = await apiRequest(`/api/orders/${id}/confirm-payment-return`, {
        method: "POST",
        body: JSON.stringify(payload || {}),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result?.message || result?.error || "Confirm payment failed",
        );
      }
      return result;
    } catch (error) {
      throw error;
    }
  },
  listOrders: async () => {
    try {
      const response = await apiRequest(`/api/orders`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result?.message || result?.error || "List orders failed",
        );
      }
      return result;
    } catch (error) {
      throw error;
    }
  },
  getMyOrders: async () => {
    try {
      const response = await apiRequest(`/api/orders/me`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result?.message || result?.error || "Get my orders failed",
        );
      }
      return result;
    } catch (error) {
      throw error;
    }
  },
};
