import { Route, Routes, Navigate } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import CategoryPage from '../pages/CategoryPage';
import Support from '../pages/Support';
import Store from '../pages/Store';
import ProductDetail from '../pages/ProductDetail';
import ForgotPassword from '../pages/ForgotPassword';
import Account from '../pages/Account';
import PaymentReturn from '../pages/PaymentReturn';
import CartPage from '../pages/CartPage';

// Admin Imports
import AdminLayout from '../layouts/admin/AdminLayout';
import Dashboard from '../pages/admin/Dashboard';
import ProductManagement from '../pages/admin/ProductManagement';
import AddProduct from '../pages/admin/AddProduct';
import EditProduct from '../pages/admin/EditProduct';
import CategoryManagement from '../pages/admin/CategoryManagement';
import OrderManagement from '../pages/admin/OrderManagement';
import CustomerManagement from '../pages/admin/CustomerManagement';
import AccountManagement from '../pages/admin/AccountManagement';
import ReviewsManagement from '../pages/admin/ReviewsManagement';
import Analytics from '../pages/admin/Analytics';
import Settings from '../pages/admin/Settings';
import ChatDashboard from '../pages/admin/ChatDashboard';
import ChatWidget from '../components/common/ChatWidget';
import ToastContainer from '../components/common/ToastContainer';
import { useAuthStore } from '../store/useAuthStore';

import '../admin.css'; // Tailwind & Admin Styles

function CustomerRoute({ children }) {
  const user = useAuthStore((state) => state.user);

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <>
      <Routes>
        {/* Customer Routes */}
        <Route path="/" element={<CustomerRoute><Home /></CustomerRoute>} />
        <Route path="/login" element={<CustomerRoute><Login /></CustomerRoute>} />
        <Route path="/register" element={<CustomerRoute><Register /></CustomerRoute>} />
        <Route path="/forgot-password" element={<CustomerRoute><ForgotPassword /></CustomerRoute>} />
        <Route path="/account" element={<CustomerRoute><Account /></CustomerRoute>} />
        <Route path="/category/:brand" element={<CustomerRoute><CategoryPage /></CustomerRoute>} />
        <Route path="/support" element={<CustomerRoute><Support /></CustomerRoute>} />
        <Route path="/store" element={<CustomerRoute><Store /></CustomerRoute>} />
        <Route path="/product/:id" element={<CustomerRoute><ProductDetail /></CustomerRoute>} />
        <Route path="/payment/return" element={<CustomerRoute><PaymentReturn /></CustomerRoute>} />
        <Route path="/cart" element={<CustomerRoute><CartPage /></CustomerRoute>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="products/new" element={<AddProduct />} />
          <Route path="products/edit/:id" element={<EditProduct />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="customers" element={<CustomerManagement />} />
          <Route path="accounts" element={<AccountManagement />} />
          <Route path="chat" element={<ChatDashboard />} />
          <Route path="reviews" element={<ReviewsManagement />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatWidget />
      <ToastContainer />
    </>
  );
}

export default App;
