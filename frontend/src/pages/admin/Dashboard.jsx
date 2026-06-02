import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Smartphone,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api/client';

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const CHART_RANGE_OPTIONS = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày qua' },
  { value: '30d', label: '30 ngày qua' },
];

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

function buildRevenueChart(orders, range = '7d') {
  const today = new Date();
  let buckets = [];

  if (range === 'today') {
    buckets = Array.from({ length: 24 }, (_, hour) => ({
      key: String(hour),
      name: `${hour}h`,
      revenue: 0,
      orders: 0,
    }));
  } else {
    const totalDays = range === '30d' ? 30 : 7;
    buckets = Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() - (totalDays - 1 - index));
      return {
        key: date.toISOString().slice(0, 10),
        name:
          range === '30d'
            ? `${date.getDate()}/${date.getMonth() + 1}`
            : DAY_LABELS[date.getDay()],
        revenue: 0,
        orders: 0,
      };
    });
  }

  const map = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  orders.forEach((order) => {
    const createdAt = new Date(order.createdAt);
    if (Number.isNaN(createdAt.getTime())) return;
    const key =
      range === 'today'
        ? String(createdAt.getHours())
        : createdAt.toISOString().slice(0, 10);
    const bucket = map.get(key);
    if (!bucket) return;

    bucket.orders += 1;
    if (order.status === 'PAID' || order.status === 'COMPLETED') {
      bucket.revenue += Number(order.totalPrice || 0);
    }
  });

  return buckets;
}

function mapOrderStatus(order) {
  if (order.status === 'PAID' || order.status === 'COMPLETED') {
    return {
      text: 'Đã thanh toán',
      statusColor: 'text-emerald-600 bg-emerald-500/10',
    };
  }
  if (order.status === 'WAITING_PAYMENT' || order.status === 'PENDING') {
    return {
      text: 'Chờ thanh toán',
      statusColor: 'text-orange-600 bg-orange-500/10',
    };
  }
  return {
    text: 'Thất bại',
    statusColor: 'text-rose-600 bg-rose-500/10',
  };
}

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartRange, setChartRange] = useState('7d');

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const [ordersRes, productsRes, customersRes, reviewsRes] =
          await Promise.all([
            apiRequest('/api/orders'),
            apiRequest('/api/products?limit=100'),
            apiRequest('/api/auth/users?role=user'),
            apiRequest('/api/products/reviews/all'),
          ]);

        const [ordersJson, productsJson, customersJson, reviewsJson] =
          await Promise.all([
            ordersRes.json(),
            productsRes.json(),
            customersRes.json(),
            reviewsRes.json(),
          ]);

        if (!mounted) return;

        setOrders(ordersJson?.data || []);
        setProducts(
          productsJson?.products ||
            productsJson?.data ||
            (Array.isArray(productsJson) ? productsJson : []),
        );
        setCustomers(customersJson?.data || []);
        setReviews(reviewsJson?.data || []);
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.message || 'Không thể tải dữ liệu dashboard');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const dashboardData = useMemo(() => {
    const paidOrders = orders.filter(
      (order) => order.status === 'PAID' || order.status === 'COMPLETED',
    );
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return !Number.isNaN(createdAt.getTime()) &&
        createdAt.toISOString().slice(0, 10) === todayKey;
    });

    const lowStockProducts = products.filter((product) => {
      const variantStocks = Array.isArray(product.variants)
        ? product.variants.flatMap((variant) =>
            Array.isArray(variant.options)
              ? variant.options.map((option) => Number(option.stock || 0))
              : [],
          )
        : [];
      const stockCandidates = variantStocks.length
        ? variantStocks
        : [Number(product.stock || 0)];
      return stockCandidates.some((stock) => stock > 0 && stock <= 5);
    });

    const chartData = buildRevenueChart(orders, chartRange);
    const previousRevenue = chartData
      .slice(0, 6)
      .reduce((sum, item) => sum + item.revenue, 0);
    const currentRevenue = chartData
      .slice(1)
      .reduce((sum, item) => sum + item.revenue, 0);

    const revenueTrend =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : currentRevenue > 0
          ? 100
          : 0;

    const previousOrders = Math.max(orders.length - todayOrders.length, 0);
    const orderTrend =
      previousOrders > 0
        ? (todayOrders.length / previousOrders) * 100
        : todayOrders.length > 0
          ? 100
          : 0;

    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    const customerMap = new Map(
      customers.map((customer) => [customer.id || customer.userId, customer]),
    );

    const topProductsMap = new Map();
    paidOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = String(item.productId || item.name || 'unknown');
        const current = topProductsMap.get(key) || {
          key,
          name: item.name || 'Sản phẩm',
          sales: 0,
          revenue: 0,
          image: item.image || '',
        };

        current.sales += Number(item.quantity || 0);
        current.revenue += Number(item.price || 0) * Number(item.quantity || 0);
        topProductsMap.set(key, current);
      });
    });

    const topProducts = Array.from(topProductsMap.values())
      .map((item) => {
        const matchedProduct = products.find(
          (product) =>
            String(product._id) === item.key || product.name === item.name,
        );
        return {
          ...item,
          image:
            item.image ||
            matchedProduct?.image ||
            matchedProduct?.images?.[0] ||
            matchedProduct?.variants?.[0]?.images?.[0] ||
            '',
        };
      })
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 4);

    return {
      chartData,
      customerMap,
      kpiCards: [
        {
          label: 'Tổng doanh thu',
          value: formatCurrency(
            paidOrders.reduce(
              (sum, order) => sum + Number(order.totalPrice || 0),
              0,
            ),
          ),
          trend: `${revenueTrend >= 0 ? '+' : ''}${revenueTrend.toFixed(1)}%`,
          isUp: revenueTrend >= 0,
          icon: DollarSign,
          color: 'text-blue-600',
          bg: 'bg-blue-500/10',
        },
        {
          label: 'Đơn hàng hôm nay',
          value: String(todayOrders.length),
          trend: `${orderTrend >= 0 ? '+' : ''}${orderTrend.toFixed(1)}%`,
          isUp: orderTrend >= 0,
          icon: ShoppingBag,
          color: 'text-emerald-600',
          bg: 'bg-emerald-500/10',
        },
        {
          label: 'Tổng khách hàng',
          value: customers.length.toLocaleString('vi-VN'),
          trend: `${customers.filter((customer) => customer.isVerified).length} đã xác minh`,
          isUp: true,
          icon: Users,
          color: 'text-violet-600',
          bg: 'bg-violet-500/10',
        },
        {
          label: 'Tổng sản phẩm',
          value: products.length.toLocaleString('vi-VN'),
          trend: `${reviews.length} đánh giá`,
          isUp: true,
          icon: Smartphone,
          color: 'text-orange-600',
          bg: 'bg-orange-500/10',
        },
        {
          label: 'Sắp hết hàng',
          value: String(lowStockProducts.length),
          trend: lowStockProducts.length > 0 ? 'Cần xử lý' : 'Ổn định',
          isUp: lowStockProducts.length === 0,
          icon: AlertTriangle,
          color: 'text-rose-600',
          bg: 'bg-rose-500/10',
        },
      ],
      recentOrders,
      topProducts,
    };
  }, [chartRange, customers, orders, products, reviews]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tổng quan Bảng điều khiển</h1>
          <p className="text-muted-foreground mt-1">
            Chào mừng quay trở lại, Quản trị viên. Đây là tình hình hôm nay.
          </p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity w-fit">
          <ArrowUpRight className="w-4 h-4" />
          Xuất báo cáo
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {dashboardData.kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card p-6 rounded-3xl border border-border hover:shadow-xl hover:shadow-primary/5 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.bg} ${card.color} p-2.5 rounded-2xl`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div
                className={`flex items-center gap-1 text-xs font-bold ${
                  card.isUp ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {card.isUp ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {card.trend}
              </div>
            </div>
            <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
              {card.label}
            </h3>
            <p className="text-2xl font-bold mt-1 tracking-tight">
              {loading ? '...' : card.value}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 bg-card p-8 rounded-3xl border border-border"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold">Phân tích Doanh thu</h3>
            <select
              value={chartRange}
              onChange={(event) => setChartRange(event.target.value)}
              className="bg-muted/50 border-none rounded-lg px-3 py-1 text-sm font-medium outline-none"
            >
              {CHART_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData.chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    color: 'hsl(var(--foreground))',
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area
                  name="Doanh thu"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card p-8 rounded-3xl border border-border"
        >
          <h3 className="text-xl font-bold mb-8">Thống kê Đơn hàng</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    color: 'hsl(var(--foreground))',
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                />
                <Bar
                  name="Đơn hàng"
                  dataKey="orders"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl border border-border overflow-hidden"
        >
          <div className="p-8 border-b border-border flex items-center justify-between">
            <h3 className="text-xl font-bold">Đơn hàng gần đây</h3>
            <Link to="/admin/orders" className="text-primary text-sm font-bold hover:underline">
              Xem tất cả
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                  <th className="px-8 py-4">Mã đơn hàng</th>
                  <th className="px-8 py-4">Khách hàng</th>
                  <th className="px-8 py-4">Trạng thái</th>
                  <th className="px-8 py-4">Tổng tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dashboardData.recentOrders.map((order) => {
                  const customer =
                    dashboardData.customerMap.get(order.userId) || null;
                  const status = mapOrderStatus(order);

                  return (
                    <tr key={order._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-8 py-4 font-bold text-sm">
                        #{String(order._id).slice(-8)}
                      </td>
                      <td className="px-8 py-4 text-sm font-medium">
                        {customer?.fullName || customer?.email || order.userId}
                      </td>
                      <td className="px-8 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.statusColor}`}
                        >
                          {status.text}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-sm font-bold tracking-tight">
                        {formatCurrency(order.totalPrice)}
                      </td>
                    </tr>
                  );
                })}
                {!loading && dashboardData.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-10 text-center text-sm text-muted-foreground">
                      Chưa có đơn hàng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl border border-border overflow-hidden"
        >
          <div className="p-8 border-b border-border flex items-center justify-between">
            <h3 className="text-xl font-bold">Sản phẩm bán chạy</h3>
            <Link to="/admin/products" className="text-primary text-sm font-bold hover:underline">
              Xem kho hàng
            </Link>
          </div>
          <div className="p-8 space-y-6">
            {dashboardData.topProducts.map((product) => (
              <div key={product.key} className="flex items-center gap-4 group">
                <div className="w-14 h-14 rounded-2xl bg-muted overflow-hidden border border-border group-hover:scale-105 transition-transform">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                      N/A
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-elppa-obsidian">{product.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {product.sales} lượt bán
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-elppa-obsidian">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              </div>
            ))}
            {!loading && dashboardData.topProducts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Chưa có dữ liệu sản phẩm bán chạy.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
