'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { money, ORDER_STATUS_AR, PAYMENT_AR } from '@/lib/format';

const NEXT: Record<string, string[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');
  const token = () => getToken() ?? '';

  const load = () => {
    apiGet('/admin/orders', { headers: { Authorization: `Bearer ${token()}` } })
      .then(setOrders)
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    load();
  }, []);

  const changeStatus = async (id: number, status: string) => {
    setError('');
    try {
      await apiPost(`/admin/orders/${id}/status`, { status }, token());
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">الطلبات</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div>
                <span className="font-extrabold">{o.orderNumber}</span>
                <span className="mx-2 text-black/30">|</span>
                <span className="bg-gold/15 text-gold-dark font-bold px-2 py-0.5 rounded text-sm">
                  {ORDER_STATUS_AR[o.status] ?? o.status}
                </span>
                <span className="mx-2 text-black/30">|</span>
                <span className="text-sm text-black/60">{PAYMENT_AR[o.paymentMethod]} · {PAYMENT_AR[o.paymentStatus]}</span>
              </div>
              <div className="font-extrabold text-gold-dark">{money(o.total)}</div>
            </div>
            <div className="text-sm text-black/60 mb-3">
              {o.address?.fullName} — {o.address?.phone} — {o.address?.city}
            </div>
            <ul className="text-sm text-black/70 mb-3">
              {o.items?.map((it: any) => (
                <li key={it.id}>• {it.productName} ×{it.quantity} ({money(it.total)})</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {NEXT[o.status]?.map((s) => (
                <button key={s} onClick={() => changeStatus(o.id, s)} className="btn-outline !py-1.5 !px-3 text-sm">
                  → {ORDER_STATUS_AR[s] ?? s}
                </button>
              ))}
              {!NEXT[o.status]?.length && <span className="text-sm text-black/40">لا إجراءات</span>}
            </div>
          </div>
        ))}
        {!orders.length && <p className="text-black/40">لا طلبات بعد</p>}
      </div>
    </div>
  );
}
