import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ArrowLeft, Truck, CreditCard, MapPin, User, Phone } from "lucide-react";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import { useCartStore } from "../store/useCartStore";
import { orderApi } from "../services/api/orderApi";
import { toast } from "../store/useToastStore";
import { formatCurrency } from "../utils/formatCurrency";

const CartPage = () => {
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Multi-step Checkout States
  const [step, setStep] = useState(1); // 1: Cart Items, 2: Shipping & Payment
  const [paymentMethod, setPaymentMethod] = useState("transfer"); // "transfer" (PayOS) or "cod" (Cash on Delivery)
  const [shippingInfo, setShippingInfo] = useState({
    recipientName: "",
    phoneNumber: "",
    address: "",
  });

  useEffect(() => {
    setIsHydrated(true);

    // Autofill logged-in user information if available
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setShippingInfo({
          recipientName: parsed.fullName || parsed.username || "",
          phoneNumber: parsed.phoneNumber || "",
          address: "",
        });
      }
    } catch (e) {
      console.error("Error parsing user details:", e);
    }
  }, []);

  const handleProceedToShipping = () => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) {
      toast.error("Vui lòng đăng nhập để tiến hành thanh toán");
      navigate("/login");
      return;
    }
    setStep(2);
  };

  const handleCheckoutSubmit = async () => {
    if (!shippingInfo.recipientName.trim()) {
      toast.error("Vui lòng nhập tên người nhận");
      return;
    }
    if (!shippingInfo.phoneNumber.trim()) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }
    if (!shippingInfo.address.trim()) {
      toast.error("Vui lòng nhập địa chỉ giao hàng");
      return;
    }

    try {
      setIsCheckingOut(true);
      const metadata = {
        shippingDetails: {
          recipientName: shippingInfo.recipientName.trim(),
          phoneNumber: shippingInfo.phoneNumber.trim(),
          address: shippingInfo.address.trim(),
        },
        paymentMethod: paymentMethod === "cod" ? "COD" : "TRANSFER",
      };

      const payload = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
      }));

      if (paymentMethod === "cod") {
        // COD Direct order creation flow
        await orderApi.createDirectOrder(payload, metadata);
        toast.success("Đặt hàng thành công!");
        useCartStore.getState().clearCart();
        navigate("/account");
      } else {
        // PayOS bank transfer flow
        const response = await orderApi.checkout(payload, metadata);
        const paymentUrl =
          response?.paymentUrl ||
          response?.checkoutUrl ||
          response?.data?.paymentUrl ||
          response?.data?.checkoutUrl;

        if (
          paymentUrl &&
          typeof paymentUrl === "string" &&
          paymentUrl.startsWith("http")
        ) {
          window.location.href = paymentUrl;
        } else {
          toast.error("Không tạo được link thanh toán");
        }
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error?.message || "Checkout thất bại");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!isHydrated) return null;

  if (items.length === 0) {
    return (
      <div className="bg-[#f5f5f7] min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex flex-col items-center justify-center p-gutter">
          <ShoppingBag className="w-20 h-20 text-elppa-gray-border mb-6" />
          <h2 className="text-3xl font-bold mb-4 text-elppa-obsidian">
            Giỏ hàng của bạn đang trống
          </h2>
          <p className="text-elppa-gray font-medium mb-8">
            Hãy thêm vài sản phẩm vào giỏ hàng nhé.
          </p>
          <button
            onClick={() => navigate("/store")}
            className="px-10 py-4 bg-elppa-blue text-white rounded-full font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-elppa-blue/20"
          >
            Tiếp tục mua sắm
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-[#f5f5f7] min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow max-w-[1000px] mx-auto w-full px-gutter py-24">
        <h1 className="text-4xl md:text-5xl font-bold text-elppa-obsidian mb-12">
          {step === 1 ? "Giỏ hàng." : "Thanh toán."}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Left Column: Cart list or Shipping details form */}
          <div className="lg:col-span-2">
            {step === 1 ? (
              <div className="space-y-6">
                {items.map((item, idx) => (
                  <div
                    key={`${item.productId}-${item.color}-${item.storage}-${idx}`}
                    className="bg-white p-6 rounded-[32px] flex flex-col sm:flex-row gap-6 items-center shadow-sm border border-elppa-gray-border/10"
                  >
                    <div className="w-32 h-32 bg-[#f5f5f7] rounded-2xl p-4 flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex-grow text-center sm:text-left w-full">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-elppa-obsidian">
                          {item.name}
                        </h3>
                        <button
                          onClick={() =>
                            removeItem(item.productId, item.color, item.storage)
                          }
                          className="text-elppa-gray hover:text-red-500 transition-colors hidden sm:block"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>

                      <div className="text-sm font-medium text-elppa-gray mb-4">
                        {item.color && (
                          <span className="mr-3">Màu: {item.color}</span>
                        )}
                        {item.storage && <span>Dung lượng: {item.storage}</span>}
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="font-bold text-lg text-elppa-obsidian">
                          {formatCurrency(item.price * item.quantity)}
                        </p>

                        <div className="flex items-center gap-4 bg-[#f5f5f7] px-2 py-1 rounded-full">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.color,
                                item.storage,
                                item.quantity - 1,
                              )
                            }
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white transition-all text-elppa-obsidian"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="font-bold w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.color,
                                item.storage,
                                item.quantity + 1,
                              )
                            }
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white transition-all text-elppa-obsidian"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          removeItem(item.productId, item.color, item.storage)
                        }
                        className="mt-4 text-sm font-bold text-red-500 hover:text-red-600 transition-colors sm:hidden w-full py-2 border border-red-100 rounded-full"
                      >
                        Xóa sản phẩm
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-sm border border-elppa-gray-border/10 space-y-8 animate-fadeIn">
                {/* Back Button */}
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-sm font-bold text-elppa-gray hover:text-elppa-blue transition-colors group"
                >
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  Quay lại giỏ hàng
                </button>

                <div>
                  <h2 className="text-3xl font-bold text-elppa-obsidian mb-2">Thông tin giao hàng</h2>
                  <p className="text-sm text-elppa-gray">Vui lòng điền đầy đủ và chính xác thông tin để quá trình giao nhận hàng được thuận lợi nhất.</p>
                </div>

                <div className="space-y-6">
                  {/* Recipient Name Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-elppa-gray uppercase tracking-widest ml-1">
                      Họ và tên người nhận
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-elppa-gray w-5 h-5" />
                      <input
                        type="text"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-elppa-gray-border/60 focus:border-elppa-blue outline-none transition-all font-medium bg-[#f5f5f7]/30 focus:bg-white"
                        placeholder="Nhập tên người nhận"
                        value={shippingInfo.recipientName}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, recipientName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Phone Number Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-elppa-gray uppercase tracking-widest ml-1">
                      Số điện thoại liên hệ
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-elppa-gray w-5 h-5" />
                      <input
                        type="tel"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-elppa-gray-border/60 focus:border-elppa-blue outline-none transition-all font-medium bg-[#f5f5f7]/30 focus:bg-white"
                        placeholder="Nhập số điện thoại liên hệ"
                        value={shippingInfo.phoneNumber}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, phoneNumber: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Address TextArea */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-elppa-gray uppercase tracking-widest ml-1">
                      Địa chỉ nhận hàng
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-5 text-elppa-gray w-5 h-5" />
                      <textarea
                        rows={3}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-elppa-gray-border/60 focus:border-elppa-blue outline-none transition-all font-medium bg-[#f5f5f7]/30 focus:bg-white resize-none"
                        placeholder="Nhập địa chỉ cụ thể (Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố)"
                        value={shippingInfo.address}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method Cards */}
                <div className="space-y-4 pt-6 border-t border-elppa-gray-border/20">
                  <div>
                    <h3 className="text-xl font-bold text-elppa-obsidian mb-1">Phương thức thanh toán</h3>
                    <p className="text-xs text-elppa-gray">Vui lòng lựa chọn hình thức thanh toán bạn muốn sử dụng.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Bank Transfer */}
                    <div
                      onClick={() => setPaymentMethod("transfer")}
                      className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between h-40 ${
                        paymentMethod === "transfer"
                          ? "border-elppa-blue bg-blue-50/10 shadow-md shadow-elppa-blue/5"
                          : "border-elppa-gray-border/40 hover:border-elppa-gray hover:bg-[#f5f5f7]/10"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className={`p-3 rounded-2xl ${paymentMethod === "transfer" ? "bg-blue-50 text-elppa-blue" : "bg-[#f5f5f7] text-elppa-gray"}`}>
                          <CreditCard size={24} />
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "transfer" ? "border-elppa-blue" : "border-elppa-gray-border"}`}>
                          {paymentMethod === "transfer" && <div className="w-2.5 h-2.5 rounded-full bg-elppa-blue" />}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-elppa-obsidian">Chuyển khoản online (PayOS)</h4>
                        <p className="text-[11px] text-elppa-gray mt-1 leading-normal">Hỗ trợ tất cả ngân hàng Việt Nam qua mã QR tiện lợi.</p>
                      </div>
                    </div>

                    {/* Cash on Delivery (COD) */}
                    <div
                      onClick={() => setPaymentMethod("cod")}
                      className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between h-40 ${
                        paymentMethod === "cod"
                          ? "border-elppa-blue bg-blue-50/10 shadow-md shadow-elppa-blue/5"
                          : "border-elppa-gray-border/40 hover:border-elppa-gray hover:bg-[#f5f5f7]/10"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className={`p-3 rounded-2xl ${paymentMethod === "cod" ? "bg-blue-50 text-elppa-blue" : "bg-[#f5f5f7] text-elppa-gray"}`}>
                          <Truck size={24} />
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "cod" ? "border-elppa-blue" : "border-elppa-gray-border"}`}>
                          {paymentMethod === "cod" && <div className="w-2.5 h-2.5 rounded-full bg-elppa-blue" />}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-elppa-obsidian">Thanh toán khi nhận hàng (COD)</h4>
                        <p className="text-[11px] text-elppa-gray mt-1 leading-normal">Nhận hàng tận nơi và thanh toán trực tiếp cho nhân viên giao hàng.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary (Always visible for easy review) */}
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-elppa-gray-border/10 lg:sticky lg:top-24">
            <h2 className="text-2xl font-bold mb-6 text-elppa-obsidian">
              Tổng quan đơn hàng
            </h2>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-elppa-gray font-medium">
                <span>Tạm tính</span>
                <span>{formatCurrency(getTotalPrice())}</span>
              </div>
              <div className="flex justify-between text-elppa-gray font-medium">
                <span>Phí giao hàng</span>
                <span className="text-green-500 font-bold">Miễn phí</span>
              </div>
              <div className="border-t border-elppa-gray-border/20 pt-4 mt-4 flex justify-between items-center">
                <span className="font-bold text-lg">Tổng cộng</span>
                <span className="font-bold text-2xl text-elppa-obsidian">
                  {formatCurrency(getTotalPrice())}
                </span>
              </div>
            </div>

            <button
              onClick={step === 1 ? handleProceedToShipping : handleCheckoutSubmit}
              disabled={isCheckingOut}
              className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl shadow-elppa-blue/20 ${isCheckingOut ? "bg-elppa-blue/50 text-white cursor-not-allowed" : "bg-elppa-blue text-white hover:bg-opacity-90"}`}
            >
              {isCheckingOut ? (
                "Đang xử lý đơn hàng..."
              ) : step === 1 ? (
                <>
                  Tiến hành thanh toán
                  <ArrowRight size={20} />
                </>
              ) : paymentMethod === "cod" ? (
                "Xác nhận & Đặt hàng COD"
              ) : (
                <>
                  Thanh toán qua PayOS
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  if (step === 2) {
                    setStep(1);
                  } else {
                    navigate("/store");
                  }
                }}
                className="text-sm font-bold text-elppa-blue hover:underline"
              >
                {step === 2 ? "Quay lại giỏ hàng" : "Tiếp tục mua sắm"}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CartPage;
