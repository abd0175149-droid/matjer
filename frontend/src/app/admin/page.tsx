'use client';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { money, ORDER_STATUS_AR } from '@/lib/format';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/admin/dashboard', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!stats) return <p className="text-black/40">جارٍ التحميل…</p>;

  const cards = [
    { label: 'إجمالي الطلبات', value: stats.totalOrders },
    { label: 'المنتجات', value: stats.totalProducts },
    { label: 'تنبيهات مخزون منخفض', value: stats.lowStockCount },
    { label: 'الإيراد المحصّل', value: money(stats.paidRevenue) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">لوحة المعلومات</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="text-sm text-black/50">{c.label}</div>
            <div className="text-2xl font-extrabold text-gold-dark mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-bold mb-3">الطلبات حسب الحالة</h2>
        <div className="flex flex-wrap gap-3">
          {stats.ordersByStatus.length ? (
            stats.ordersByStatus.map((s: any) => (
              <div key={s.status} className="bg-gold/10 text-gold-dark rounded-lg px-4 py-2 text-sm font-bold">
                {ORDER_STATUS_AR[s.status] ?? s.status}: {s.count}
              </div>
            ))
          ) : (
            <span className="text-black/40">لا طلبات بعد</span>
          )}
        </div>
      </div>
    </div>
  );
}
