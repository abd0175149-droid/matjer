'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { money, ORDER_STATUS_AR, PAYMENT_AR } from '@/lib/format';

const STATUSES = ['', 'NEW', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'];

export default function AdminOrders() {
  const token = () => getToken() ?? '';
  const [orders, setOrders] = useState<any[]>([]);
  const [f, setF] = useState({ status: '', q: '', from: '', to: '' });
  const [error, setError] = useState('');

  const load = () => {
    const qs = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => v && qs.set(k, v));
    apiGet(`/admin/orders?${qs.toString()}`, { headers: { Authorization: `Bearer ${token()}` } }).then(setOrders).catch((e) => setError(e.message));
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">الطلبات</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}

      <div className="card p-3 mb-4 grid sm:grid-cols-5 gap-2">
        <input className="input" placeholder="رقم/اسم/هاتف" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          {STATUSES.map((s) => <option key={s} value={s}>{s ? ORDER_STATUS_AR[s] : 'كل الحالات'}</option>)}
        </select>
        <input className="input" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        <input className="input" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
        <button className="btn-gold" onClick={load}>بحث</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-black/5 text-right"><tr><th className="p-3">الرقم</th><th className="p-3">العميل</th><th className="p-3">الإجمالي</th><th className="p-3">الدفع</th><th className="p-3">الحالة</th><th className="p-3"></th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-black/5">
                <td className="p-3 font-bold">{o.orderNumber}</td>
                <td className="p-3">{o.address?.fullName}<div className="text-xs text-black/40">{o.address?.phone}</div></td>
                <td className="p-3">{money(o.total)}</td>
                <td className="p-3 text-xs">{PAYMENT_AR[o.paymentMethod]}<br/>{PAYMENT_AR[o.paymentStatus]}</td>
                <td className="p-3"><span className="bg-gold/15 text-gold-dark px-2 py-0.5 rounded text-xs font-bold">{ORDER_STATUS_AR[o.status] ?? o.status}</span></td>
                <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="text-gold-dark font-bold">إدارة</Link></td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan={6} className="p-6 text-center text-black/40">لا طلبات</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
