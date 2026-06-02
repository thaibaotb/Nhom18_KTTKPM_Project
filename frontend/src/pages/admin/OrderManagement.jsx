import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Eye,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CreditCard,
  Truck,
  X,
  User,
  Phone,
  MapPin,
  ShoppingBag,
  Clock,
  DollarSign,
} from "lucide-react";
import { cn } from "../../utils/admin-utils";
import { orderApi } from "../../services/api/orderApi";
import { toast } from "../../store/useToastStore";

const mockOrders = [];

const statusStyles = {
  Delivered: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  Pending: "text-orange-600 bg-orange-500/10 border-orange-500/20",
  Shipping: "text-blue-600 bg-blue-500/10 border-blue-500/20",
  Cancelled: "text-rose-600 bg-rose-500/10 border-rose-500/20",
};

const OrderManagement = () => {
  const [filter, setFilter] = useState("Tất cả");
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await orderApi.listOrders();
        if (mounted && res && res.data) {
          setOrders(res.data);
        }
      } catch (err) {
        console.error("Failed to load orders:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Listen to ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedOrder(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered orders
  const filteredOrders = (orders.length ? orders : mockOrders).filter((order) => {
    // 1. Status Filter
    let matchesTab = true;
    if (filter === "Chờ xử lý") {
      matchesTab = order.status === "PENDING" || order.status === "WAITING_PAYMENT";
    } else if (filter === "Đang giao") {
      matchesTab =
        order.status === "WAITING_DELIVERY" ||
        order.status === "SHIPPING" ||
        order.status === "IN_TRANSIT";
    } else if (filter === "Đã giao") {
      matchesTab = order.status === "COMPLETED" || order.status === "PAID" || order.status === "SUCCESS";
    } else if (filter === "Đã hủy") {
      matchesTab = order.status === "CANCELLED" || order.status === "FAILED";
    }

    // 2. Search query matching
    const orderIdStr = order._id ? String(order._id).toLowerCase() : "";
    const customerName = (
      (order.user && order.user.fullName) ||
      order.metadata?.shippingDetails?.recipientName ||
      order.userId ||
      "Khách hàng"
    ).toLowerCase();
    const matchesSearch =
      orderIdStr.includes(searchQuery.toLowerCase()) ||
      customerName.includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Đơn hàng</h1>
          <p className="text-muted-foreground mt-1">
            Theo dõi và quản lý các đơn hàng và quá trình thực hiện của khách hàng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-border bg-card hover:bg-muted text-foreground rounded-xl text-sm font-bold transition-all shadow-sm">
            <Download className="w-4 h-4" />
            Xuất dữ liệu
          </button>
        </div>
      </div>

      {/* Tabs / Quick Filters */}
      <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto no-scrollbar">
        {["Tất cả", "Chờ xử lý", "Đang giao", "Đã giao", "Đã hủy"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "px-4 py-3 text-sm font-bold transition-all relative min-w-max",
              filter === tab ? "text-primary font-extrabold" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
            {filter === tab && (
              <motion.div
                layoutId="order-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo Mã đơn hoặc tên khách hàng..."
              className="pl-10 pr-4 py-2 bg-card border border-border rounded-xl w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-border bg-card rounded-xl text-sm font-bold hover:bg-muted transition-all text-foreground shadow-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Khoảng thời gian
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                <th className="px-8 py-5">Mã đơn</th>
                <th className="px-8 py-5">Khách hàng</th>
                <th className="px-8 py-5">Sản phẩm</th>
                <th className="px-8 py-5">Tổng tiền</th>
                <th className="px-8 py-5">Thanh toán</th>
                <th className="px-8 py-5">Trạng thái</th>
                <th className="px-8 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <motion.tr
                    layout
                    key={order._id || order.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-8 py-5 font-bold text-sm text-foreground">
                      {order._id ? `#${String(order._id).slice(-8).toUpperCase()}` : order.id}
                    </td>
                    <td className="px-8 py-5">
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {order.metadata?.shippingDetails?.recipientName ||
                            (order.user && order.user.fullName) ||
                            order.userId ||
                            "Khách hàng"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {order.metadata?.shippingDetails?.phoneNumber ||
                            (order.user && order.user.email) ||
                            order.email ||
                            "Không có SĐT"}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-muted-foreground">
                      {(order.items || []).length} món
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold tracking-tight text-foreground">
                        {Number(order.totalPrice || order.total || 0).toLocaleString()}đ
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-tighter">
                        <CreditCard className="w-3 h-3" />
                        {order.metadata && order.metadata.paymentMethod === "COD"
                          ? "COD (Tiền mặt)"
                          : order.metadata && order.metadata.paymentMethod === "TRANSFER"
                            ? "PayOS (QR)"
                            : order.metadata && order.metadata.returnUrl
                              ? "PayOS"
                              : "COD"}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            order.status === "PAID" || order.status === "COMPLETED" || order.status === "SUCCESS"
                              ? "bg-emerald-500 animate-pulse"
                              : order.status === "CANCELLED" || order.status === "FAILED"
                                ? "bg-rose-500"
                                : "bg-orange-500",
                          )}
                        />
                        <span className="text-xs font-bold text-foreground">
                          {order.status === "PAID" || order.status === "COMPLETED" || order.status === "SUCCESS"
                            ? "Đã thanh toán"
                            : order.status === "CANCELLED" || order.status === "FAILED"
                              ? "Đã hủy"
                              : "Chưa thanh toán"}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          order.status === "COMPLETED" || order.status === "PAID" || order.status === "SUCCESS"
                            ? statusStyles.Delivered
                            : order.status === "PENDING" || order.status === "WAITING_PAYMENT"
                              ? statusStyles.Pending
                              : order.status === "WAITING_DELIVERY" ||
                                  order.status === "SHIPPING" ||
                                  order.status === "IN_TRANSIT"
                                ? statusStyles.Shipping
                                : statusStyles.Cancelled,
                        )}
                      >
                        {order.status === "COMPLETED" || order.status === "PAID" || order.status === "SUCCESS"
                          ? "Đã giao"
                          : order.status === "PENDING" || order.status === "WAITING_PAYMENT"
                            ? "Chờ xử lý"
                            : order.status === "WAITING_DELIVERY" ||
                                order.status === "SHIPPING" ||
                                order.status === "IN_TRANSIT"
                              ? "Đang giao"
                              : "Đã hủy"}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg text-[10px] font-bold uppercase transition-all text-foreground"
                        >
                          <Eye className="w-3 h-3" />
                          Chi tiết
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-sm font-medium text-muted-foreground italic">
                    Không tìm thấy đơn hàng nào phù hợp...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/10">
          <p className="text-sm text-muted-foreground font-medium italic">
            * Tất cả thời gian đơn hàng được tính theo giờ UTC+7
          </p>
          <div className="flex items-center gap-2">
            <button className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modern Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-2xl bg-card rounded-[32px] border border-border shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border flex items-center justify-between bg-muted/10">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      MÃ ĐƠN HÀNG
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">
                      {new Date(selectedOrder.createdAt || Date.now()).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black mt-1 text-foreground">
                    {selectedOrder._id
                      ? `#${String(selectedOrder._id).toUpperCase()}`
                      : selectedOrder.id}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 bg-muted/65 hover:bg-muted/100 rounded-full border border-border text-foreground hover:scale-105 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-8 overflow-y-auto space-y-8 flex-1 scrollbar-thin">
                {/* Status Alert Banner */}
                <div
                  className={cn(
                    "p-4 rounded-2xl border flex items-center gap-3",
                    selectedOrder.status === "COMPLETED" || selectedOrder.status === "PAID" || selectedOrder.status === "SUCCESS"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                      : selectedOrder.status === "CANCELLED" || selectedOrder.status === "FAILED"
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-600"
                        : "bg-orange-500/10 border-orange-500/20 text-orange-600",
                  )}
                >
                  <Clock className="w-5 h-5 shrink-0" />
                  <div className="text-sm">
                    Trạng thái hiện tại:{" "}
                    <span className="font-extrabold uppercase">
                      {selectedOrder.status === "COMPLETED" || selectedOrder.status === "PAID" || selectedOrder.status === "SUCCESS"
                        ? "Đã hoàn thành / Đã thanh toán"
                        : selectedOrder.status === "PENDING" || selectedOrder.status === "WAITING_PAYMENT"
                          ? "Đang chờ xử lý / Chờ thanh toán"
                          : selectedOrder.status === "WAITING_DELIVERY" ||
                              selectedOrder.status === "SHIPPING" ||
                              selectedOrder.status === "IN_TRANSIT"
                            ? "Đang đóng gói / Đang giao hàng"
                            : "Đã hủy đơn hàng"}
                    </span>
                  </div>
                </div>

                {/* Delivery Information Section */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold flex items-center gap-2 border-b border-border pb-2 text-foreground">
                    <Truck className="w-5 h-5 text-primary" />
                    Thông tin giao nhận hàng
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-2xl border border-border">
                    <div className="space-y-4">
                      {/* Recipient Name */}
                      <div className="flex gap-3">
                        <User className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                            Người nhận hàng
                          </p>
                          <p className="text-sm font-bold mt-0.5 text-foreground">
                            {selectedOrder.metadata?.shippingDetails?.recipientName ||
                              (selectedOrder.user && selectedOrder.user.fullName) ||
                              "Khách vãng lai"}
                          </p>
                        </div>
                      </div>

                      {/* Phone Number */}
                      <div className="flex gap-3">
                        <Phone className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                            Số điện thoại liên hệ
                          </p>
                          <p className="text-sm font-bold mt-0.5 text-foreground">
                            {selectedOrder.metadata?.shippingDetails?.phoneNumber ||
                              "Không cung cấp SĐT"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="flex gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                          Địa chỉ giao nhận
                        </p>
                        <p className="text-sm font-bold mt-0.5 text-foreground leading-relaxed">
                          {selectedOrder.metadata?.shippingDetails?.address ||
                            "Nhận trực tiếp tại Showroom Apple Store"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Information Section */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold flex items-center gap-2 border-b border-border pb-2 text-foreground">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Thông tin thanh toán
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-2xl border border-border">
                    <div className="flex gap-3">
                      <CreditCard className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                          Phương thức thanh toán
                        </p>
                        <p className="text-sm font-extrabold mt-0.5 text-foreground text-primary">
                          {selectedOrder.metadata?.paymentMethod === "COD"
                            ? "Thanh toán khi nhận hàng (COD)"
                            : selectedOrder.metadata?.paymentMethod === "TRANSFER"
                              ? "Chuyển khoản trực tuyến qua PayOS"
                              : selectedOrder.metadata?.returnUrl
                                ? "Chuyển khoản ngân hàng"
                                : "Thanh toán bằng tiền mặt (COD)"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <DollarSign className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                          Trạng thái giao dịch
                        </p>
                        <p
                          className={cn(
                            "text-sm font-extrabold mt-0.5",
                            selectedOrder.status === "PAID" || selectedOrder.status === "COMPLETED" || selectedOrder.status === "SUCCESS"
                              ? "text-emerald-500"
                              : "text-orange-500",
                          )}
                        >
                          {selectedOrder.status === "PAID" || selectedOrder.status === "COMPLETED" || selectedOrder.status === "SUCCESS"
                            ? "ĐÃ THANH TOÁN THÀNH CÔNG"
                            : "CHƯA THANH TOÁN (COD HOẶC CHỜ QR)"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items List */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold flex items-center gap-2 border-b border-border pb-2 text-foreground">
                    <ShoppingBag className="w-5 h-5 text-primary" />
                    Danh sách sản phẩm ({selectedOrder.items?.length || 0})
                  </h3>

                  <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-muted/5">
                    {(selectedOrder.items || []).map((item, idx) => (
                      <div key={idx} className="p-4 flex justify-between items-center gap-4 hover:bg-muted/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-muted/65 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 text-muted-foreground border border-border">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{item.name}</p>
                            <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wide">
                              {item.color && <span>Màu: {item.color}</span>}
                              {item.storage && <span>Dung lượng: {item.storage}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">
                            {Number(item.price).toLocaleString()}đ
                          </p>
                          <p className="text-xs text-muted-foreground font-medium mt-0.5">
                            Số lượng: <span className="font-bold text-foreground">{item.quantity}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-border bg-muted/15 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Tổng giá trị đơn hàng
                  </p>
                  <p className="text-3xl font-black text-foreground mt-1">
                    {Number(selectedOrder.totalPrice || selectedOrder.total || 0).toLocaleString()}đ
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-end">
                  {selectedOrder.status !== "PAID" &&
                    selectedOrder.status !== "COMPLETED" &&
                    selectedOrder.status !== "SUCCESS" &&
                    (selectedOrder.metadata?.paymentMethod === "COD" ||
                      !selectedOrder.metadata?.paymentMethod) && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await orderApi.confirmPaymentReturn(
                              selectedOrder._id || selectedOrder.id,
                              { status: "PAID" }
                            );
                            if (res && res.success) {
                              const updatedOrder = {
                                ...selectedOrder,
                                status: "PAID",
                              };
                              setSelectedOrder(updatedOrder);
                              setOrders((prevOrders) =>
                                prevOrders.map((o) =>
                                  (o._id || o.id) === (selectedOrder._id || selectedOrder.id)
                                    ? { ...o, status: "PAID" }
                                    : o
                                )
                              );
                              toast.success("Xác nhận đã thanh toán thành công!");
                            }
                          } catch (err) {
                            console.error("Xác nhận thanh toán thất bại:", err);
                            toast.error("Xác nhận thanh toán thất bại: " + err.message);
                          }
                        }}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/10 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Xác nhận đã thanh toán
                      </button>
                    )}
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl transition-all shadow-lg hover:shadow-primary/10 shadow-primary/5 active:scale-[0.98]"
                  >
                    Đóng chi tiết đơn
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderManagement;
