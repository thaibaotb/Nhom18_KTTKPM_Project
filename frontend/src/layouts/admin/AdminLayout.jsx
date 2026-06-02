import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Smartphone, 
  Layers, 
  ShoppingBag, 
  Users, 
  ShieldCheck,
  MessageSquare,
  MessageCircle,
  BarChart3, 
  Settings, 
  ChevronLeft, 
  Menu, 
  Search, 
  Bell, 
  Moon, 
  Sun,
  User,
  LogOut
} from 'lucide-react';
import { cn } from '../../utils/admin-utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Bảng điều khiển', path: '/admin' },
  { icon: Smartphone, label: 'Sản phẩm', path: '/admin/products' },
  { icon: Layers, label: 'Danh mục', path: '/admin/categories' },
  { icon: ShoppingBag, label: 'Đơn hàng', path: '/admin/orders' },
  { icon: Users, label: 'Khách hàng', path: '/admin/customers' },
  { icon: ShieldCheck, label: 'Tài khoản', path: '/admin/accounts' },
  { icon: MessageCircle, label: 'Hỗ trợ chat', path: '/admin/chat' },
  { icon: MessageSquare, label: 'Đánh giá', path: '/admin/reviews' },
  { icon: BarChart3, label: 'Phân tích', path: '/admin/analytics' },
  { icon: Settings, label: 'Cài đặt', path: '/admin/settings' },
];

const AdminLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? 'dark' : ''}`}>
      <div className="flex bg-background text-foreground transition-colors duration-300">
        
        {/* Sidebar */}
        <aside 
          className={cn(
            "fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300",
            isCollapsed ? "w-20" : "w-64",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-border">
              {!isCollapsed && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary"
                >
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                    E
                  </div>
                  <span>ELPPA Admin</span>
                </motion.div>
              )}
              {isCollapsed && (
                <div className="w-8 h-8 mx-auto bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                  E
                </div>
              )}
              <button 
                onClick={toggleSidebar}
                className="hidden md:flex p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <ChevronLeft className={cn("w-5 h-5 transition-transform duration-300", isCollapsed && "rotate-180")} />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link 
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                        : "text-muted-foreground hover:bg-muted hover:text-primary"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "" : "group-hover:scale-110 transition-transform")} />
                    {!isCollapsed && (
                      <motion.span 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                    {isActive && (
                      <motion.div 
                        layoutId="active-pill"
                        className="absolute inset-0 bg-primary rounded-xl -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-border">
              <button 
                onClick={handleLogout}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-all",
                  isCollapsed && "justify-center"
                )}
              >
                <LogOut className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="font-medium">Đăng xuất</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={cn(
          "flex-1 transition-all duration-300",
          isCollapsed ? "md:pl-20" : "md:pl-64"
        )}>
          {/* Topbar */}
          <header className="h-16 sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm..." 
                  className="pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-xl w-64 md:w-80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={toggleDarkMode}
                className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
              </button>

              <div className="h-8 w-[1px] bg-border mx-2 hidden md:block" />

              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-all group"
                title="Đăng xuất"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors">
                  A
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold leading-none">Quản trị viên</p>
                  <p className="text-[10px] mt-1">Đăng xuất</p>
                </div>
                <LogOut className="w-4 h-4 ml-2" />
              </button>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-4 md:p-8 max-w-[1600px] mx-auto">
            <Outlet />
          </main>
        </div>

        {/* Mobile Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminLayout;
