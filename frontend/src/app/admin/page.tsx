'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { money, ORDER_STATUS_AR } from '@/lib/format';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const h = { headers: { Authorization: `Bearer ${getToken()}` } };
    apiGet('/admin/dashboard', h).then(setStats).catch((e) => setError(e.message));
    apiGet('/admin/orders', h).then((o) => setRecent(o.slice(0, 6))).catch(() => {});
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

      <div className="card p-5 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold">أحدث الطلبات</h2>
          <Link href="/admin/orders" className="text-gold-dark text-sm font-bold">عرض الكل</Link>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {recent.map((o) => (
              <tr key={o.id} className="border-b border-black/5">
                <td className="py-2"><Link href={`/admin/orders/${o.id}`} className="font-bold text-gold-dark">{o.orderNumber}</Link></td>
                <td className="py-2">{o.address?.fullName}</td>
                <td className="py-2">{ORDER_STATUS_AR[o.status] ?? o.status}</td>
                <td className="py-2 text-left">{money(o.total)}</td>
              </tr>
            ))}
            {!recent.length && <tr><td className="py-3 text-black/40">لا طلبات</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

