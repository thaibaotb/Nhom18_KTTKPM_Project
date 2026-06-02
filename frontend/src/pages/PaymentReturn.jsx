import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import OrderStatusBadge from "../components/common/OrderStatusBadge";
import { orderApi } from "../services/api/orderApi";
import { apiRequest } from "../services/api/client";
import { usePolling } from "../hooks/usePolling";
import { useCartStore } from "../store/useCartStore";
import { formatCurrency } from "../utils/formatCurrency";

const PaymentReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("orderId");
  const returnStatus = String(searchParams.get("status") || "").toUpperCase();
  const providerCode = String(searchParams.get("code") || "");
  const isCancelled = String(searchParams.get("cancel") || "").toLowerCase() === "true";

  const paymentLookupId =
    searchParams.get("orderCode") ||
    searchParams.get("order_code") ||
    searchParams.get("id") ||
    searchParams.get("order");

  const [isPolling, setIsPolling] = useState(true);
  const [order, setOrder] = useState(null);
  const hasConfirmedRef = useRef(false);

  const resolveOrderIdFromPayment = useCallback(async () => {
    if (!paymentLookupId) return null;

    const response = await apiRequest(
      `/api/payments/${encodeURIComponent(paymentLookupId)}`,
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message || result?.error || "Payment not found");
    }

    const payment = result?.data || result;
    return payment?.orderId || null;
  }, [paymentLookupId]);

  const fetchOrder = useCallback(async () => {
    if (!orderId && !paymentLookupId) {
      setIsPolling(false);
      return null;
    }
    try {
      let effectiveOrderId = orderId;

      if (!effectiveOrderId && paymentLookupId) {
        effectiveOrderId = await resolveOrderIdFromPayment();
      }

      if (!effectiveOrderId) {
        setIsPolling(false);
        return null;
      }

      const response = await orderApi.getOrder(effectiveOrderId);
      const data = response?.data || response;

      if (data) {
        setOrder(data);
        // Stop polling if we reached a terminal state
        if (data?.status === "PAID" || data?.status === "FAILED") {
          setIsPolling(false);
          if (data?.status === "PAID") {
            useCartStore.getState().clearCart();
          }
        }
        return data;
      }
    } catch (err) {
      // Rethrow to let usePolling handle the error
      throw err;
    }
  }, [orderId, paymentLookupId, resolveOrderIdFromPayment]);

  const { error } = usePolling(fetchOrder, isPolling, 2000);

  const confirmReturnedPayment = useCallback(async () => {
    if (!orderId || hasConfirmedRef.current) return;

    const shouldConfirmPaid = returnStatus === "PAID" || providerCode === "00";
    const shouldConfirmFailed = isCancelled || returnStatus === "CANCELLED";

    if (!shouldConfirmPaid && !shouldConfirmFailed) {
      return;
    }

    hasConfirmedRef.current = true;
    const normalizedStatus = shouldConfirmPaid ? "PAID" : "FAILED";

    try {
      const response = await orderApi.confirmPaymentReturn(orderId, {
        status: normalizedStatus,
        paymentLookupId,
        paymentId: paymentLookupId,
      });
      const data = response?.data || response;
      if (data) {
        setOrder(data);
        if (data.status === "PAID") {
          useCartStore.getState().clearCart();
        }
        if (data.status === "PAID" || data.status === "FAILED") {
          setIsPolling(false);
        }
      }
    } catch (confirmError) {
      hasConfirmedRef.current = false;
    }
  }, [isCancelled, orderId, paymentLookupId, providerCode, returnStatus]);

  useEffect(() => {
    if (!orderId && !paymentLookupId) {
      setIsPolling(false);
    }
  }, [orderId, paymentLookupId]);

  useEffect(() => {
    confirmReturnedPayment();
  }, [confirmReturnedPayment]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isPolling) {
        fetchOrder();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchOrder, isPolling]);

  const handleRetry = () => {
    setIsPolling(false);
    setTimeout(() => setIsPolling(true), 100);
  };

  if (!orderId && !paymentLookupId) {
    return (
      <div className="bg-[#f5f5f7] min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-gutter">
          <div className="bg-white p-12 rounded-[40px] text-center border border-elppa-gray-border/10 shadow-sm max-w-md w-full">
            <XCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
            <h2 className="text-2xl font-bold mb-3 text-elppa-obsidian">
              Lỗi thanh toán
            </h2>
            <p className="text-elppa-gray font-medium mb-8">
              Không tìm thấy mã đơn hàng hợp lệ.
            </p>
            <button
              onClick={() => navigate("/store")}
              className="px-10 py-4 w-full bg-elppa-obsidian text-white rounded-full font-bold hover:bg-black transition-all shadow-lg"
            >
              Quay lại cửa hàng
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const renderContent = () => {
    if (!order && !error) {
      return (
        <div className="text-center py-10">
          <Loader className="w-12 h-12 mx-auto mb-6 text-elppa-blue animate-spin" />
          <h2 className="text-2xl font-bold mb-3 text-elppa-obsidian">
            Đang kiểm tra đơn hàng...
          </h2>
          <p className="text-elppa-gray font-medium">
            Vui lòng đợi trong giây lát.
          </p>
        </div>
      );
    }

    if (error && !order) {
      const isMaxRetries = error?.message?.includes("Max polling");

      return (
        <div className="text-center py-10">
          <XCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
          <h2 className="text-2xl font-bold mb-3 text-elppa-obsidian">
            Không thể lấy thông tin
          </h2>
          <p className="text-elppa-gray font-medium mb-8">
            {isMaxRetries
              ? "Mạng không ổn định hoặc hệ thống đang bận. Vui lòng thử lại."
              : error?.message || "Có lỗi xảy ra khi lấy trạng thái đơn hàng."}
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            {isMaxRetries && (
              <button
                onClick={handleRetry}
                className="px-6 py-3 w-full bg-elppa-blue text-white rounded-full font-bold hover:bg-opacity-90 transition-all shadow-lg"
              >
                Thử lại
              </button>
            )}
            <button
              onClick={() => navigate("/store")}
              className={`px-6 py-3 w-full rounded-full font-bold transition-all shadow-lg ${isMaxRetries ? "bg-white border-2 border-elppa-obsidian text-elppa-obsidian hover:bg-gray-50" : "bg-elppa-obsidian text-white hover:bg-black"}`}
            >
              Quay lại cửa hàng
            </button>
          </div>
        </div>
      );
    }

    const isPaid = order?.status === "PAID";
    const isFailed = order?.status === "FAILED";
    const isWaiting =
      order?.status === "WAITING_PAYMENT" || order?.status === "PENDING";

    return (
      <div className="text-center py-6">
        {isPaid && (
          <CheckCircle className="w-20 h-20 mx-auto mb-6 text-green-500" />
        )}
        {isFailed && (
          <XCircle className="w-20 h-20 mx-auto mb-6 text-red-500" />
        )}
        {isWaiting && (
          <Loader className="w-20 h-20 mx-auto mb-6 text-yellow-500 animate-spin" />
        )}

        <h2 className="text-3xl font-bold mb-4 text-elppa-obsidian">
          {isPaid && "Thanh toán thành công!"}
          {isFailed && "Thanh toán thất bại"}
          {isWaiting && "Đang xử lý thanh toán..."}
        </h2>

        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="text-elppa-gray font-medium">
            Trạng thái đơn hàng:
          </span>
          <OrderStatusBadge status={order?.status} />
        </div>

        <div className="bg-[#f5f5f7] rounded-3xl p-6 mb-8 text-left max-w-sm mx-auto">
          <div className="flex justify-between mb-3">
            <span className="text-elppa-gray font-medium">Mã đơn hàng</span>
            <span className="font-bold text-elppa-obsidian">
              {order?._id || orderId}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-elppa-gray font-medium">Tổng tiền</span>
            <span className="font-bold text-elppa-obsidian">
              {formatCurrency(order?.totalPrice)}
            </span>
          </div>
        </div>

        {isPaid ? (
          <button
            onClick={() => navigate("/account")}
            className="px-10 py-4 w-full max-w-sm bg-elppa-blue text-white rounded-full font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-elppa-blue/20"
          >
            Xem đơn hàng của tôi
          </button>
        ) : (
          <button
            onClick={() => navigate("/store")}
            className="px-10 py-4 w-full max-w-sm bg-elppa-obsidian text-white rounded-full font-bold hover:bg-black transition-all shadow-lg"
          >
            Quay lại cửa hàng
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#f5f5f7] min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow flex items-center justify-center p-gutter py-24">
        <div className="bg-white p-8 md:p-12 rounded-[40px] border border-elppa-gray-border/10 shadow-sm max-w-[600px] w-full">
          {renderContent()}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentReturn;
