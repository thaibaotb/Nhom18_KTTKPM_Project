import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  ChevronRight,
  Shield,
  Truck,
  RotateCcw,
  Star,
  User,
  MessageCircle,
} from "lucide-react";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import axios from "axios";
import MinimalProductCard from "../components/category/MinimalProductCard";
import { apiRequest } from "../services/api/client";
import { orderApi } from "../services/api/orderApi";
import { useAuthStore } from "../store/useAuthStore";
import { useCartStore } from "../store/useCartStore";
import { toast } from "../store/useToastStore";
import { formatCurrency } from "../utils/formatCurrency";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedStorage, setSelectedStorage] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { user, isAuthenticated } = useAuthStore();
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [starRating, setStarRating] = useState(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const checkoutLock = React.useRef(false);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    if (!product || !product._id) {
      toast.error("Sản phẩm không hợp lệ.");
      return;
    }
    const priceToUse = Number(displayPrice);
    if (isNaN(priceToUse) || priceToUse <= 0) {
      toast.error("Giá sản phẩm không hợp lệ.");
      return;
    }
    addItem({
      productId: product._id,
      name: product?.name || "Sản phẩm",
      price: priceToUse,
      quantity: 1,
      image: mainImage || "",
      color: currentVariant?.colorName || "",
      storage: selectedOption?.storage || "",
    });
    toast.success("Đã thêm sản phẩm vào giỏ hàng!");
  };

  const handleCheckout = async () => {
    if (checkoutLock.current) return;
    try {
      checkoutLock.current = true;
      // TODO: Integrate with cart system when available instead of direct checkout
      if (!product || !product._id) {
        toast.error("Sản phẩm không hợp lệ.");
        return;
      }

      const priceToUse = Number(displayPrice);
      if (isNaN(priceToUse) || priceToUse <= 0) {
        toast.error("Giá sản phẩm không hợp lệ.");
        return;
      }

      setIsCheckingOut(true);
      const payload = [
        {
          productId: product._id,
          name: product?.name || "Sản phẩm",
          price: priceToUse,
          quantity: 1,
        },
      ];

      const response = await orderApi.checkout(payload);
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
        toast.error(
          response?.message ||
            "Có lỗi xảy ra khi tạo đơn hàng. Không tìm thấy đường dẫn thanh toán.",
        );
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(
        error?.message || "Có lỗi xảy ra khi thanh toán. Vui lòng thử lại.",
      );
    } finally {
      setIsCheckingOut(false);
      checkoutLock.current = false;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiRequest(`/api/products/${id}`);
        const result = await response.json();

        // Lấy dữ liệu sản phẩm (linh hoạt với cả result.data hoặc result)
        const productData = result.data || result;
        if (productData && productData._id) {
          setProduct(productData);
        }

        // Lấy danh sách sản phẩm gợi ý
        const relatedResponse = await apiRequest(`/api/products`);
        const relatedResult = await relatedResponse.json();

        // Theo Store.jsx, dữ liệu nằm trong trường .products
        const productsArray =
          relatedResult.products ||
          relatedResult.data ||
          (Array.isArray(relatedResult) ? relatedResult : []);

        console.log("Total products from API:", productsArray.length);

        if (productsArray && productsArray.length > 0) {
          // So sánh ID bằng cách ép kiểu String để đảm bảo chính xác
          const filtered = productsArray
            .filter((p) => String(p._id) !== String(id))
            .slice(0, 4);
          console.log("Related products after filtering:", filtered.length);
          setRelatedProducts(filtered);
        }

        setLoading(false);
      } catch (err) {
        console.error("Fetch error details:", err);
        setLoading(false);
      }
    };
    fetchData();
    window.scrollTo(0, 0);
  }, [id]);

  // Lấy tất cả ảnh từ tất cả các biến thể
  const getAllProductImages = () => {
    let allImgs = [];
    if (product?.variants && product.variants.length > 0) {
      product.variants.forEach((variant, vIdx) => {
        if (Array.isArray(variant.images)) {
          variant.images.forEach((img, iIdx) => {
            allImgs.push({
              url: img,
              colorIndex: vIdx,
              imageIndex: iIdx,
              colorName: variant.colorName,
            });
          });
        }
      });
    }

    // Nếu không có variants hoặc không có ảnh trong variants, lấy ảnh chung của product
    if (allImgs.length === 0 && product) {
      const fallbackImgs = Array.isArray(product.images)
        ? product.images
        : [product.image];
      fallbackImgs.filter(Boolean).forEach((img, idx) => {
        allImgs.push({ url: img, colorIndex: 0, imageIndex: idx });
      });
    }
    return allImgs;
  };

  const allImages = getAllProductImages();

  // Xác định ảnh chính dựa trên selectedColor và activeImageIndex
  const mainImage =
    allImages.find(
      (img) =>
        img.colorIndex === selectedColor && img.imageIndex === activeImageIndex,
    )?.url ||
    allImages[0]?.url ||
    "";

  // Hàm xử lý khi nhấn vào ảnh nhỏ
  const handleThumbnailClick = (imgData) => {
    setSelectedColor(imgData.colorIndex);
    setActiveImageIndex(imgData.imageIndex);
  };

  // Reset ảnh về tấm đầu tiên khi người dùng chủ động đổi màu qua nút màu sắc
  useEffect(() => {
    // Chỉ reset nếu ảnh hiện tại không thuộc màu vừa chọn
    const currentImgData = allImages.find((img) => img.url === mainImage);
    if (currentImgData && currentImgData.colorIndex !== selectedColor) {
      setActiveImageIndex(0);
    }
  }, [selectedColor]);

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-elppa-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center p-gutter text-center">
        <h1 className="text-2xl font-bold mb-4">Không tìm thấy sản phẩm</h1>
        <button
          onClick={() => navigate("/store")}
          className="text-elppa-blue hover:underline flex items-center gap-1 font-medium"
        >
          Quay lại cửa hàng <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  const hasVariants = product?.variants && product.variants.length > 0;
  const currentVariant = hasVariants ? product.variants[selectedColor] : null;

  // Lấy các bản dung lượng của màu đang chọn
  const storageOptions =
    currentVariant &&
    currentVariant.options &&
    currentVariant.options.length > 0
      ? currentVariant.options
      : [];

  // Lấy thông tin bản đang chọn (Màu + Dung lượng)
  const selectedOption = storageOptions[selectedStorage] || storageOptions[0];
  const displayPrice = selectedOption ? selectedOption.price : product.price;
  const currentStock = selectedOption ? selectedOption.stock : product.stock;

  return (
    <div className="bg-[#f5f5f7] min-h-screen pb-24">
      <Navbar />

      <div className="bg-white/80 backdrop-blur-md sticky top-12 z-40 border-b border-elppa-gray-border/20 py-3">
        <div className="max-w-[1000px] mx-auto px-gutter flex items-center justify-between">
          <h2 className="text-lg font-bold text-elppa-obsidian">
            {product.name}
          </h2>
          <div className="flex items-center gap-6">
            <p className="text-sm font-medium hidden md:block">
              Từ {formatCurrency(displayPrice)}
            </p>
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className={`bg-elppa-blue text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-opacity-90 transition-all ${isCheckingOut ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isCheckingOut ? "Đang xử lý..." : "Mua ngay"}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1000px] mx-auto px-gutter pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="lg:sticky lg:top-32">
            <AnimatePresence mode="wait">
              <motion.div
                key={mainImage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-[32px] p-12 aspect-square flex items-center justify-center overflow-hidden shadow-sm"
              >
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {allImages.map((imgData, i) => (
                <div
                  key={i}
                  onClick={() => handleThumbnailClick(imgData)}
                  className={`flex-shrink-0 bg-white rounded-2xl w-20 h-20 p-3 cursor-pointer border-2 transition-all ${mainImage === imgData.url ? "border-elppa-blue" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  <img
                    src={imgData.url}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-12">
            <div>
              <p className="text-elppa-blue text-sm font-bold uppercase tracking-widest mb-2">
                Mới
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-elppa-obsidian mb-4">
                Mua {product.name}
              </h1>
              <p className="text-elppa-gray font-medium">
                Nhận từ {formatCurrency(displayPrice)} hoặc trả góp chỉ từ{" "}
                {formatCurrency(displayPrice / 12)}/tháng trong 12 tháng.
              </p>
            </div>

            {hasVariants && (
              <div>
                <h3 className="text-lg font-bold mb-4">
                  Chọn màu sắc.{" "}
                  <span className="text-elppa-gray font-normal">
                    {currentVariant?.colorName}
                  </span>
                </h3>
                <div className="flex gap-4">
                  {product.variants.map((variant, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedColor(idx)}
                      style={{ backgroundColor: variant.colorCode }}
                      className={`w-10 h-10 rounded-full border-2 ${selectedColor === idx ? "border-elppa-blue ring-2 ring-elppa-blue/20" : "border-black/5"} transition-all`}
                      title={variant.colorName}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-bold mb-4">Chọn dung lượng.</h3>
              <div className="grid grid-cols-2 gap-4">
                {storageOptions.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedStorage(idx)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${selectedStorage === idx ? "border-elppa-blue bg-white" : "border-elppa-gray-border/50 bg-white hover:border-elppa-gray"}`}
                  >
                    <p className="font-bold text-lg">{option.storage}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-elppa-gray">
                        {formatCurrency(option.price)}
                      </p>
                      <p
                        className={`text-[10px] font-bold ${option.stock > 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {option.stock > 0 ? `Còn ${option.stock}` : "Hết hàng"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 space-y-6">
              <div className="flex gap-4">
                <div className="text-elppa-blue">
                  <Truck size={24} />
                </div>
                <div>
                  <p className="font-bold text-sm">Giao hàng miễn phí</p>
                  <p className="text-xs text-elppa-gray mt-1">
                    Giao hàng tận nơi trong 24h tại nội thành.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 border-t border-elppa-gray-border/20 pt-6">
                <div className="text-elppa-blue">
                  <RotateCcw size={24} />
                </div>
                <div>
                  <p className="font-bold text-sm">Đổi trả dễ dàng</p>
                  <p className="text-xs text-elppa-gray mt-1">
                    Hoàn tiền 100% trong 15 ngày nếu không hài lòng.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 border-t border-elppa-gray-border/20 pt-6">
                <div className="text-elppa-blue">
                  <Shield size={24} />
                </div>
                <div>
                  <p className="font-bold text-sm">Bảo hành 2 năm</p>
                  <p className="text-xs text-elppa-gray mt-1">
                    Bao gồm cả lỗi người dùng (tùy chọn).
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                onClick={handleAddToCart}
                className="w-full bg-elppa-blue text-white py-4 rounded-2xl font-bold text-lg hover:bg-opacity-90 transition-all flex items-center justify-center gap-3"
              >
                <ShoppingBag size={20} />
                Thêm vào giỏ hàng
              </button>
            </div>
          </div>
        </div>

        <section className="mt-32">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-20 text-elppa-obsidian leading-tight">
            Tại sao {product.name} lại <br className="hidden md:block" /> là lựa
            chọn hàng đầu?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {(product.highlights && product.highlights.length > 0
              ? product.highlights
              : [
                  {
                    title: "Hiệu năng vô đối.",
                    description:
                      "Sức mạnh từ chip mới nhất giúp bạn xử lý mọi tác vụ nặng nhất một cách mượt mà.",
                  },
                  {
                    title: "Camera chuyên nghiệp.",
                    description:
                      "Ghi lại mọi khoảnh khắc với độ chi tiết kinh ngạc và màu sắc sống động nhất.",
                  },
                ]
            ).map((highlight, idx) => (
              <div
                key={idx}
                className="bg-white rounded-[40px] p-12 relative h-[320px] flex flex-col justify-center border border-elppa-gray-border/10 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group"
              >
                <div className="z-10 text-center md:text-left">
                  <h4 className="text-2xl md:text-3xl font-bold mb-4 text-elppa-obsidian group-hover:text-elppa-blue transition-colors">
                    {highlight.title}
                  </h4>
                  <p className="text-elppa-gray font-medium text-lg leading-relaxed">
                    {highlight.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-32 bg-white rounded-[40px] p-12 md:p-20 shadow-sm border border-elppa-gray-border/20">
          <h2 className="text-3xl font-bold mb-12">Thông số kỹ thuật.</h2>
          <div className="divide-y divide-elppa-gray-border/30">
            {product.specifications ? (
              Object.entries(product.specifications).map(
                ([key, value], idx) => (
                  <div
                    key={idx}
                    className="py-6 grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <span className="text-elppa-gray font-medium">{key}</span>
                    <span className="md:col-span-2 font-bold text-elppa-obsidian">
                      {value}
                    </span>
                  </div>
                ),
              )
            ) : (
              <>
                <div className="py-6 grid grid-cols-3">
                  <span className="text-elppa-gray font-medium">Màn hình</span>
                  <span className="col-span-2 font-bold">
                    Thông số đang cập nhật
                  </span>
                </div>
                <div className="py-6 grid grid-cols-3">
                  <span className="text-elppa-gray font-medium">Vi xử lý</span>
                  <span className="col-span-2 font-bold">
                    Thông số đang cập nhật
                  </span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Review Section */}
        <section className="mt-32 max-w-[800px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-elppa-obsidian">
              Đánh giá & Bình luận.
            </h2>
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    fill={
                      star <= Math.round(product.averageRating || 0)
                        ? "#f59e0b"
                        : "none"
                    }
                    className={
                      star <= Math.round(product.averageRating || 0)
                        ? "text-amber-500"
                        : "text-elppa-gray-border"
                    }
                  />
                ))}
              </div>
              <p className="text-xl font-bold text-elppa-obsidian">
                {(product.averageRating || 0).toFixed(1)}
                <span className="text-elppa-gray font-medium text-base ml-2">
                  / 5 dựa trên {product.numReviews || 0} đánh giá
                </span>
              </p>
            </div>
          </div>

          <div className="space-y-12">
            {/* Review Form - Only for logged in users */}
            {isAuthenticated ? (
              <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-sm border border-elppa-gray-border/10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-elppa-blue/10 flex items-center justify-center text-elppa-blue">
                    <User size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-elppa-gray uppercase tracking-widest">
                      Đang đăng nhập với tư cách
                    </p>
                    <p className="font-bold text-lg text-elppa-obsidian">
                      {user?.fullName || "Người dùng Apple"}
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const rating = formData.get("rating");
                    const comment = formData.get("comment");

                    if (!rating || rating === "0") {
                      toast.error("Vui lòng chọn số sao đánh giá");
                      return;
                    }
                    if (!comment) {
                      toast.error("Vui lòng nhập nội dung đánh giá");
                      return;
                    }

                    setIsSubmittingReview(true);
                    try {
                      const res = await apiRequest(
                        `/api/products/${product._id}/reviews`,
                        {
                          method: "POST",
                          body: JSON.stringify({
                            rating: Number(rating),
                            comment,
                            userName: user?.fullName || "Khách hàng",
                            user: user?._id || user?.id || "anonymous",
                          }),
                        },
                      );
                      const result = await res.json();
                      if (result.success) {
                        setProduct(result.data);
                        e.target.reset();
                        setStarRating(0);
                      }
                    } catch (err) {
                      console.error("Review error:", err);
                    } finally {
                      setIsSubmittingReview(false);
                    }
                  }}
                >
                  <div className="space-y-8">
                    <div>
                      <label className="text-xs font-bold text-elppa-gray uppercase tracking-widest block mb-4">
                        Bạn đánh giá sản phẩm này mấy sao?
                      </label>
                      <div className="flex gap-3">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setStarRating(s)}
                            className="hover:scale-125 transition-all duration-300 transform"
                          >
                            <Star
                              size={32}
                              fill={s <= starRating ? "#f59e0b" : "none"}
                              className={
                                s <= starRating
                                  ? "text-amber-500"
                                  : "text-elppa-gray-border"
                              }
                            />
                          </button>
                        ))}
                        <input type="hidden" name="rating" value={starRating} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold text-elppa-gray uppercase tracking-widest">
                        Nội dung đánh giá
                      </label>
                      <textarea
                        name="comment"
                        placeholder="Chia sẻ trải nghiệm thực tế của bạn về sản phẩm này..."
                        className="w-full bg-[#f5f5f7] border-none rounded-3xl px-6 py-5 outline-none focus:ring-2 focus:ring-elppa-blue/20 transition-all text-base font-medium h-40 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="w-full bg-elppa-blue text-white py-5 rounded-[24px] font-bold text-base hover:bg-opacity-90 transition-all shadow-xl shadow-elppa-blue/20 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isSubmittingReview ? "Đang gửi..." : "Gửi đánh giá ngay"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-[40px] text-center border border-elppa-gray-border/10 shadow-sm">
                <div className="w-20 h-20 bg-[#f5f5f7] rounded-full flex items-center justify-center mx-auto mb-6 text-elppa-gray">
                  <Shield size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-elppa-obsidian">
                  Chia sẻ cảm nhận của bạn
                </h3>
                <p className="text-elppa-gray font-medium mb-8 max-w-md mx-auto">
                  Vui lòng đăng nhập tài khoản Apple của bạn để có thể gửi đánh
                  giá và bình luận về sản phẩm này.
                </p>
                <button
                  onClick={() =>
                    navigate("/login", { state: { from: `/product/${id}` } })
                  }
                  className="px-10 py-4 bg-elppa-obsidian text-white rounded-full font-bold hover:bg-black transition-all shadow-lg"
                >
                  Đăng nhập ngay
                </button>
              </div>
            )}

            {/* Review List */}
            <div className="space-y-6 pt-12 border-t border-elppa-gray-border/20">
              <h3 className="text-xl font-bold mb-8">
                Tất cả bình luận ({product.numReviews || 0})
              </h3>
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((rev, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    key={idx}
                    className="bg-white p-8 rounded-[32px] border border-elppa-gray-border/10 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#f5f5f7] flex items-center justify-center text-elppa-gray border border-elppa-gray-border/10">
                          <User size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-base text-elppa-obsidian">
                            {rev.userName}
                          </p>
                          <p className="text-xs text-elppa-gray font-medium">
                            {new Date(rev.createdAt).toLocaleDateString(
                              "vi-VN",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-0.5 bg-amber-50 px-3 py-1.5 rounded-full">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            fill={s <= rev.rating ? "#f59e0b" : "none"}
                            className={
                              s <= rev.rating
                                ? "text-amber-500"
                                : "text-amber-200"
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-elppa-obsidian text-base leading-relaxed font-medium pl-2 border-l-4 border-elppa-blue/10">
                      {rev.comment}
                    </p>
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center opacity-50">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-elppa-gray-border" />
                  <p className="text-lg font-medium text-elppa-gray">
                    Sản phẩm này chưa có bình luận nào.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mt-32">
            <h2 className="text-3xl font-bold mb-12">Có thể bạn cũng thích.</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((item) => (
                <MinimalProductCard key={item._id} product={item} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
