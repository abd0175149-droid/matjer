'use client';
import { useState } from 'react';
import { apiGet } from '@/lib/api';
import { money, ORDER_STATUS_AR } from '@/lib/format';

export default function TrackPage() {
  const [id, setId] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async (uuid?: string) => {
    const key = (uuid ?? id).trim();
    if (!key) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const data = await apiGet(`/orders/track/${key}`);
      setOrder(data);
    } catch (e: any) {
      setError(e.message || 'لم يُعثر على الطلب');
    } finally {
      setLoading(false);
    }
  };

  // اقرأ ?id من الرابط عند أول تحميل
  if (typeof window !== 'undefined' && !order && !loading && !error) {
    const u = new URLSearchParams(window.location.search).get('id');
    if (u && id !== u) {
      setId(u);
      search(u);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 my-10">
      <h1 className="text-2xl font-extrabold mb-4">تتبّع الطلب</h1>
      <div className="flex gap-2 mb-6">
        <input className="input" placeholder="أدخل رمز التتبّع (UUID)" value={id} onChange={(e) => setId(e.target.value)} />
        <button className="btn-gold whitespace-nowrap" onClick={() => search()} disabled={loading}>
          {loading ? '...' : 'بحث'}
        </button>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {order && (
        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-sm text-black/50">رقم الطلب</div>
              <div className="font-extrabold">{order.orderNumber}</div>
            </div>
            <span className="bg-gold/15 text-gold-dark font-bold px-3 py-1 rounded-lg">
              {ORDER_STATUS_AR[order.status] ?? order.status}
            </span>
          </div>

          <ul className="space-y-2 text-sm mb-4">
            {order.items.map((it: any) => (
              <li key={it.id} className="flex justify-between">
                <span>{it.productName} ×{it.quantity}</span>
                <span>{money(it.total)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t pt-3 flex justify-between font-bold">
            <span>الإجمالي</span>
            <span className="text-gold-dark">{money(order.total)}</span>
          </div>

          <div className="mt-5">
            <h3 className="font-bold mb-2 text-sm">مسار الحالة</h3>
            <ol className="space-y-1 text-sm text-black/70">
              {order.statusHistory?.map((h: any) => (
                <li key={h.id}>• {ORDER_STATUS_AR[h.status] ?? h.status}{h.note ? ` — ${h.note}` : ''}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
