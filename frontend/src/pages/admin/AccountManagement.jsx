import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Mail,
  Phone,
  ShieldCheck,
  Users,
  UserCheck,
  UserCog,
  Filter,
  Trash2,
} from 'lucide-react';
import { apiRequest } from '../../services/api/client';
import { cn } from '../../utils/admin-utils';

const ROLE_TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' },
];

function getInitials(name, email) {
  const source = name || email || '??';
  return source
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AccountManagement = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [actionError, setActionError] = useState('');
  const [busyAccountId, setBusyAccountId] = useState('');

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadAccounts = async () => {
      setLoading(true);
      try {
        const response = await apiRequest('/api/auth/users');
        const result = await response.json();
        if (mounted && result.success) {
          setAccounts(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAccounts();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredAccounts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchesRole =
        roleFilter === 'all' || String(account.role).toLowerCase() === roleFilter;
      const matchesVerification =
        verificationFilter === 'all' ||
        (verificationFilter === 'verified' && account.isVerified) ||
        (verificationFilter === 'unverified' && !account.isVerified);
      const matchesSearch =
        !keyword ||
        String(account.fullName || '').toLowerCase().includes(keyword) ||
        String(account.email || '').toLowerCase().includes(keyword) ||
        String(account.phoneNumber || '').toLowerCase().includes(keyword);

      return matchesRole && matchesVerification && matchesSearch;
    });
  }, [accounts, roleFilter, search, verificationFilter]);

  const stats = useMemo(
    () => [
      {
        label: 'Tổng tài khoản',
        value: accounts.length.toLocaleString('vi-VN'),
        icon: Users,
      },
      {
        label: 'Tài khoản admin',
        value: accounts
          .filter((account) => String(account.role).toLowerCase() === 'admin')
          .length.toLocaleString('vi-VN'),
        icon: UserCog,
      },
      {
        label: 'Tài khoản user',
        value: accounts
          .filter((account) => String(account.role).toLowerCase() === 'user')
          .length.toLocaleString('vi-VN'),
        icon: ShieldCheck,
      },
      {
        label: 'Đã xác minh',
        value: accounts
          .filter((account) => account.isVerified)
          .length.toLocaleString('vi-VN'),
        icon: UserCheck,
      },
    ],
    [accounts],
  );

  const handleRoleChange = async (account, nextRole) => {
    if (!account?.id || !nextRole || nextRole === account.role) return;

    setActionError('');
    setBusyAccountId(account.id);
    try {
      const response = await apiRequest(`/api/auth/users/${account.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || 'Cập nhật role thất bại');
      }

      setAccounts((prev) =>
        prev.map((item) => (item.id === account.id ? result.data : item)),
      );
    } catch (error) {
      setActionError(error.message || 'Cập nhật role thất bại');
    } finally {
      setBusyAccountId('');
    }
  };

  const handleDeleteAccount = async (account) => {
    if (!account?.id) return;

    const confirmed = window.confirm(
      `Xóa tài khoản ${account.email}? Hành động này không thể hoàn tác.`,
    );
    if (!confirmed) return;

    setActionError('');
    setBusyAccountId(account.id);
    try {
      const response = await apiRequest(`/api/auth/users/${account.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || 'Xóa tài khoản thất bại');
      }

      setAccounts((prev) => prev.filter((item) => item.id !== account.id));
    } catch (error) {
      setActionError(error.message || 'Xóa tài khoản thất bại');
    } finally {
      setBusyAccountId('');
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý tài khoản</h1>
          <p className="text-muted-foreground mt-1">
            Theo dõi toàn bộ tài khoản của hệ thống, bao gồm cả admin và user.
          </p>
        </div>
      </div>

      {actionError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card p-6 rounded-3xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {stat.label}
            </p>
            <p className="text-3xl font-bold tracking-tight mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto no-scrollbar">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setRoleFilter(tab.value)}
            className={cn(
              'px-4 py-3 text-sm font-bold transition-all relative min-w-max',
              roleFilter === tab.value
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {roleFilter === tab.value && (
              <motion.div
                layoutId="account-role-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, email hoặc số điện thoại..."
              className="pl-10 pr-4 py-2 bg-card border border-border rounded-xl w-full lg:w-96 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 border border-border bg-card rounded-xl text-sm font-bold">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={verificationFilter}
                onChange={(event) => setVerificationFilter(event.target.value)}
                className="bg-transparent outline-none"
              >
                <option value="all">Mọi trạng thái</option>
                <option value="verified">Đã xác minh</option>
                <option value="unverified">Chưa xác minh</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                <th className="px-8 py-5">Tài khoản</th>
                <th className="px-8 py-5">Liên hệ</th>
                <th className="px-8 py-5">Role</th>
                <th className="px-8 py-5">Xác minh</th>
                <th className="px-8 py-5">Ngày tạo</th>
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
                        Đang tải tài khoản...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground">
                    Không tìm thấy tài khoản phù hợp.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => {
                  const isBusy = busyAccountId === account.id;
                  const isCurrentAdmin = currentUser?.id === account.id || currentUser?.userId === account.id;

                  return (
                    <tr key={account.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {getInitials(account.fullName, account.email)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-elppa-obsidian">
                              {account.fullName || account.email.split('@')[0]}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              ID: {account.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {account.email}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {account.phoneNumber || 'Chưa cập nhật'}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <select
                          value={account.role}
                          disabled={isBusy}
                          onChange={(event) => handleRoleChange(account, event.target.value)}
                          className={cn(
                            'px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider outline-none border',
                            String(account.role).toLowerCase() === 'admin'
                              ? 'text-blue-700 bg-blue-50 border-blue-200'
                              : 'text-slate-700 bg-slate-50 border-slate-200',
                          )}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={cn(
                            'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                            account.isVerified
                              ? 'text-emerald-600 bg-emerald-500/10'
                              : 'text-rose-600 bg-rose-500/10',
                          )}
                        >
                          {account.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm font-medium text-muted-foreground">
                        {account.createdAt
                          ? new Date(account.createdAt).toLocaleString('vi-VN')
                          : 'N/A'}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={() => handleDeleteAccount(account)}
                          disabled={isBusy}
                          title={isCurrentAdmin ? 'Không thể tự xóa tài khoản của chính mình' : 'Xóa tài khoản'}
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                            isCurrentAdmin
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-rose-50 text-rose-600 hover:bg-rose-100',
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                          Xóa
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

export default AccountManagement;
