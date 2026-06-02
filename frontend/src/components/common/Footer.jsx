import React from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Truck,
  CreditCard
} from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-elppa-light border-t border-elppa-gray-border/30 pt-20 pb-10">
      <div className="max-w-[1200px] mx-auto px-gutter">
        {/* Top Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-20 border-b border-elppa-gray-border/20">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
              <Truck className="w-6 h-6 text-elppa-blue" />
            </div>
            <h4 className="font-bold text-elppa-obsidian mb-2">Giao hàng miễn phí</h4>
            <p className="text-sm text-elppa-gray">Cho mọi đơn hàng trên 20 triệu đồng tại nội thành.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
              <ShieldCheck className="w-6 h-6 text-elppa-blue" />
            </div>
            <h4 className="font-bold text-elppa-obsidian mb-2">Bảo hành chính hãng</h4>
            <p className="text-sm text-elppa-gray">Cam kết 100% sản phẩm chính hãng, bảo hành 12 tháng.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
              <CreditCard className="w-6 h-6 text-elppa-blue" />
            </div>
            <h4 className="font-bold text-elppa-obsidian mb-2">Thanh toán an toàn</h4>
            <p className="text-sm text-elppa-gray">Hỗ trợ trả góp 0% qua thẻ tín dụng và nhiều ví điện tử.</p>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 py-20">
          {/* Brand & Contact */}
          <div className="space-y-6">
            <Link to="/" className="text-2xl font-bold tracking-tight text-elppa-obsidian">ELPPA</Link>
            <p className="text-sm text-elppa-gray leading-relaxed">
              Trải nghiệm công nghệ tối giản và hiện đại. Chúng tôi mang đến những sản phẩm tốt nhất với dịch vụ tận tâm.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-elppa-gray hover:text-elppa-obsidian transition-colors">
                <Phone className="w-4 h-4" />
                <span className="text-sm font-medium">0917 949 410</span>
              </div>
              <div className="flex items-center gap-3 text-elppa-gray hover:text-elppa-obsidian transition-colors">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">pnquangcn0406@gmail.com</span>
              </div>
              <div className="flex items-start gap-3 text-elppa-gray">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">12 Nguyễn Văn Bảo, Hạnh Thông, Hồ Chí Minh 700000, Việt Nam</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:pl-10">
            <h4 className="font-bold text-elppa-obsidian mb-8">Cửa hàng</h4>
            <ul className="space-y-4">
              {['iPhone', 'iPad', 'Samsung', 'Xiaomi', 'Oppo'].map((item) => (
                <li key={item}>
                  <Link to={`/category/${item.toLowerCase()}`} className="text-sm text-elppa-gray hover:text-elppa-blue flex items-center group">
                    <ChevronRight className="w-3 h-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold text-elppa-obsidian mb-8">Hỗ trợ</h4>
            <ul className="space-y-4">
              {['Tìm cửa hàng', 'Dịch vụ bảo hành', 'Chính sách đổi trả', 'Câu hỏi thường gặp', 'Liên hệ chúng tôi'].map((item) => (
                <li key={item}>
                  <Link to="/support" className="text-sm text-elppa-gray hover:text-elppa-blue flex items-center group">
                    <ChevronRight className="w-3 h-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Map Integration */}
          <div className="space-y-6">
            <h4 className="font-bold text-elppa-obsidian mb-8">Vị trí cửa hàng</h4>
            <div className="rounded-2xl overflow-hidden border border-elppa-gray-border/30 h-48 shadow-sm group">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.8582379865!2d106.68427047586942!3d10.822058958349202!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317528e5496d03cf%3A0xe503525a1d2d147a!2zMTIgTmd1eeG7hW4gVsSDbiBC4bqjbywgSMsetG5oIFRow7RuZywgR8_DsiBW4bqlcCwgVGjDoG5oIHBo4buRIEjhu5MgQ2jDrSBNaW5oLCBWaeG7hXQgTmFt!5e0!3m2!1svi!2s!4v1715672000000!5m2!1svi!2s"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale group-hover:grayscale-0 transition-all duration-500"
              ></iframe>
            </div>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-elppa-gray hover:text-elppa-blue shadow-sm hover:shadow transition-all">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-elppa-gray hover:text-elppa-blue shadow-sm hover:shadow transition-all">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-elppa-gray hover:text-elppa-blue shadow-sm hover:shadow transition-all">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-elppa-gray hover:text-elppa-blue shadow-sm hover:shadow transition-all">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.377.505 9.377.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-elppa-gray-border/20 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-elppa-gray">
            © 2024 Cửa hàng tối giản ELPPA. Bảo lưu mọi quyền.
          </p>
          <div className="flex gap-8">
            <Link to="/privacy" className="text-xs text-elppa-gray hover:text-elppa-obsidian transition-colors">Chính sách bảo mật</Link>
            <Link to="/terms" className="text-xs text-elppa-gray hover:text-elppa-obsidian transition-colors">Điều khoản sử dụng</Link>
            <Link to="/sitemap" className="text-xs text-elppa-gray hover:text-elppa-obsidian transition-colors">Sơ đồ trang</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
