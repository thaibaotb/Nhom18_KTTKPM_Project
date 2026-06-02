import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '../../utils/admin-utils';
import { apiRequest } from '../../services/api/client';

const BRAND_COLORS = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#64748b', '#ef4444'];
const MONTH_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

function buildMonthlySales(orders) {
  const now = new Date();
  const months = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (6 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      name: MONTH_LABELS[date.getMonth()],
      revenue: 0,
      orders: 0,
      profit: 0,
    };
  });

  const monthMap = new Map(months.map((item) => [item.key, item]));
  orders.forEach((order) => {
    const createdAt = new Date(order.createdAt);
    if (Number.isNaN(createdAt.getTime())) return;

    const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    const bucket = monthMap.get(key);
    if (!bucket) return;

    bucket.orders += 1;
    if (order.status === 'PAID' || order.status === 'COMPLETED') {
      const revenue = Number(order.totalPrice || 0);
      bucket.revenue += revenue;
      bucket.profit += revenue * 0.245;
    }
  });

  return months;
}

function getBrandName(product) {
  if (typeof product?.category === 'string' && product.category.trim()) {
    return product.category.trim();
  }

  const name = String(product?.name || '').toLowerCase();
  if (name.includes('iphone')) return 'iPhone';
  if (name.includes('ipad')) return 'iPad';
  if (name.includes('samsung') || name.includes('galaxy')) return 'Samsung';
  if (name.includes('xiaomi') || name.includes('redmi')) return 'Xiaomi';
  if (name.includes('oppo')) return 'Oppo';
  return 'Khác';
}

const Analytics = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadAnalytics = async () => {
      setLoading(true);
      setError('');

      try {
        const [ordersRes, productsRes, customersRes] = await Promise.all([
          apiRequest('/api/orders'),
          apiRequest('/api/products?limit=100'),
          apiRequest('/api/auth/users?role=user'),
        ]);

        const [ordersJson, productsJson, customersJson] = await Promise.all([
          ordersRes.json(),
          productsRes.json(),
          customersRes.json(),
        ]);

        if (!mounted) return;

        setOrders(ordersJson?.data || []);
        setProducts(
          productsJson?.products ||
            productsJson?.data ||
            (Array.isArray(productsJson) ? productsJson : []),
        );
        setCustomers(customersJson?.data || []);
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.message || 'Không thể tải dữ liệu phân tích');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, []);

  const analyticsData = useMemo(() => {
    const paidOrders = orders.filter(
      (order) => order.status === 'PAID' || order.status === 'COMPLETED',
    );
    const monthlySales = buildMonthlySales(orders);

    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + Number(order.totalPrice || 0),
      0,
    );
    const totalProfit = totalRevenue * 0.245;
    const averageOrderValue = paidOrders.length
      ? totalRevenue / paidOrders.length
      : 0;

    const customerOrderCount = new Map();
    paidOrders.forEach((order) => {
      customerOrderCount.set(
        order.userId,
        (customerOrderCount.get(order.userId) || 0) + 1,
      );
    });

    const repeatCustomers = Array.from(customerOrderCount.values()).filter(
      (count) => count > 1,
    ).length;
    const conversionRate = customers.length
      ? (customerOrderCount.size / customers.length) * 100
      : 0;
    const retentionRate = customerOrderCount.size
      ? (repeatCustomers / customerOrderCount.size) * 100
      : 0;
    const netMargin = totalRevenue ? (totalProfit / totalRevenue) * 100 : 0;

    const previousRevenue = monthlySales
      .slice(0, 6)
      .reduce((sum, item) => sum + item.revenue, 0);
    const currentRevenue = monthlySales
      .slice(1)
      .reduce((sum, item) => sum + item.revenue, 0);
    const revenueTrend =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : currentRevenue > 0
          ? 100
          : 0;

    const previousAov = paidOrders.length > 1
      ? paidOrders
          .slice(0, Math.max(paidOrders.length - 1, 0))
          .reduce((sum, order) => sum + Number(order.totalPrice || 0), 0) /
        Math.max(paidOrders.length - 1, 1)
      : 0;
    const aovTrend =
      previousAov > 0
        ? ((averageOrderValue - previousAov) / previousAov) * 100
        : averageOrderValue > 0
          ? 100
          : 0;

    const categoryRevenue = new Map();
    paidOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const matchedProduct = products.find(
          (product) =>
            String(product._id) === String(item.productId) ||
            product.name === item.name,
        );
        const brand = getBrandName(matchedProduct || item);
        categoryRevenue.set(
          brand,
          (categoryRevenue.get(brand) || 0) +
            Number(item.price || 0) * Number(item.quantity || 0),
        );
      });
    });

    const totalCategoryRevenue = Array.from(categoryRevenue.values()).reduce(
      (sum, value) => sum + value,
      0,
    );

    const categoryData = Array.from(categoryRevenue.entries())
      .map(([name, revenue], index) => ({
        name,
        value: totalCategoryRevenue
          ? Number(((revenue / totalCategoryRevenue) * 100).toFixed(1))
          : 0,
        revenue,
        color: BRAND_COLORS[index % BRAND_COLORS.length],
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    return {
      monthlySales,
      categoryData,
      stats: [
        {
          label: 'Giá trị đơn hàng TB',
          value: formatCurrency(averageOrderValue),
          trend: `${aovTrend >= 0 ? '+' : ''}${aovTrend.toFixed(1)}%`,
          isUp: aovTrend >= 0,
        },
        {
          label: 'Tỷ lệ chuyển đổi',
          value: `${conversionRate.toFixed(2)}%`,
          trend: `${customerOrderCount.size}/${customers.length || 0} khách mua`,
          isUp: true,
        },
        {
          label: 'Tỷ lệ giữ chân KH',
          value: `${retentionRate.toFixed(1)}%`,
          trend: `${repeatCustomers} khách quay lại`,
          isUp: retentionRate >= 50,
        },
        {
          label: 'Biên lợi nhuận ròng',
          value: `${netMargin.toFixed(1)}%`,
          trend: `${revenueTrend >= 0 ? '+' : ''}${revenueTrend.toFixed(1)}%`,
          isUp: revenueTrend >= 0,
        },
      ],
    };
  }, [customers, orders, products]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Phân tích Kinh doanh</h1>
          <p className="text-muted-foreground mt-1">
            Phân tích chuyên sâu về hiệu suất và xu hướng bán hàng của cửa hàng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-bold hover:bg-muted transition-all">
            <Calendar className="w-4 h-4" />
            7 tháng gần nhất
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
            <Download className="w-4 h-4" />
            Tải báo cáo
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsData.stats.map((stat) => (
          <div key={stat.label} className="bg-card p-6 rounded-3xl border border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {stat.label}
            </p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-2xl font-bold tracking-tight">
                {loading ? '...' : stat.value}
              </p>
              <div
                className={cn(
                  'flex items-center gap-0.5 text-xs font-bold',
                  stat.isUp ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {stat.isUp ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {stat.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card p-8 rounded-3xl border border-border">
          <h3 className="text-xl font-bold mb-8">Tăng trưởng Doanh thu & Lợi nhuận</h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData.monthlySales}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                  fill="url(#colorRev)"
                />
                <Area
                  name="Lợi nhuận"
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card p-8 rounded-3xl border border-border">
          <h3 className="text-xl font-bold mb-8">Doanh số theo Thương hiệu</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.categoryData}
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analyticsData.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 space-y-3">
            {analyticsData.categoryData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-sm font-bold">{item.value}%</span>
              </div>
            ))}
            {!loading && analyticsData.categoryData.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Chưa có dữ liệu doanh số theo thương hiệu.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
