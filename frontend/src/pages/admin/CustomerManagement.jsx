import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiRequest } from '../../services/api/client';
import { orderApi } from '../../services/api/orderApi';
import {
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  ShoppingBag,
  Filter,
  UserPlus,
  Users,
  UserCheck,
} from 'lucide-react';
import { cn } from '../../utils/admin-utils';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [customerOrderStats, setCustomerOrderStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const [customersResponse, ordersResponse] = await Promise.all([
        apiRequest('/api/auth/users?role=user'),
        orderApi.listOrders(),
      ]);

      const customersResult = await customersResponse.json();
      if (customersResult.success) {
        setCustomers(customersResult.data || []);
      }

      const orders = ordersResponse?.data || [];
      const statsByUser = orders.reduce((acc, order) => {
        const userId = String(order.userId || '');
        if (!userId) return acc;

        if (!acc[userId]) {
          acc[userId] = { ordersCount: 0, totalSpent: 0 };
        }

        acc[userId].ordersCount += 1;
        if (order.status === 'PAID' || order.status === 'COMPLETED') {
          acc[userId].totalSpent += Number(order.totalPrice || 0);
        }

        return acc;
      }, {});

      setCustomerOrderStats(statsByUser);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Khách hàng</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý quan hệ khách hàng và xem lịch sử mua hàng của họ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
            <UserPlus className="w-4 h-4" />
            Thêm khách hàng
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Tổng khách hàng',
            value: customers.length.toLocaleString('vi-VN'),
            trend: '+0%',
            icon: Users,
          },
          {
            label: 'Đã xác minh',
            value: customers
              .filter((customer) => customer.isVerified)
              .length.toLocaleString('vi-VN'),
            trend: '+0%',
            icon: UserCheck,
          },
          {
            label: 'Mới trong tuần',
            value: customers
              .filter(
                (customer) =>
                  new Date(customer.createdAt) >
                  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              )
              .length.toLocaleString('vi-VN'),
            trend: '+0%',
            icon: UserPlus,
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-card p-6 rounded-3xl border border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {stat.label}
            </p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-lg">
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm khách hàng..."
              className="pl-10 pr-4 py-2 bg-card border border-border rounded-xl w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-border bg-card rounded-xl text-sm font-bold hover:bg-muted transition-all">
              <Filter className="w-4 h-4 text-muted-foreground" />
              Bộ lọc nâng cao
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                <th className="px-8 py-5">Khách hàng</th>
                <th className="px-8 py-5">Liên hệ</th>
                <th className="px-8 py-5">Đơn hàng</th>
                <th className="px-8 py-5">Tổng chi tiêu</th>
                <th className="px-8 py-5">Trạng thái</th>
                <th className="px-8 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                        Đang tải khách hàng...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground">
                    Không tìm thấy khách hàng nào.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const customerKey = String(customer.id || customer.userId || '');
                  const stats = customerOrderStats[customerKey] || {
                    ordersCount: 0,
                    totalSpent: 0,
                  };

                  return (
                    <tr key={customer.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {getInitials(customer.fullName)}
                          </div>
                          <p className="text-sm font-bold text-elppa-obsidian">
                            {customer.fullName || customer.email.split('@')[0]}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {customer.phoneNumber || 'Chưa cập nhật'}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-elppa-obsidian">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                          {stats.ordersCount}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold tracking-tight text-primary">
                        {Number(stats.totalSpent || 0).toLocaleString('vi-VN')}đ
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={cn(
                            'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                            customer.isVerified
                              ? 'text-emerald-600 bg-emerald-500/10'
                              : 'text-rose-600 bg-rose-500/10',
                          )}
                        >
                          {customer.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-all">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement;
