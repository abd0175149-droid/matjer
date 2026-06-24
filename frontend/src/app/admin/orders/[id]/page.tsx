'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { money, ORDER_STATUS_AR, PAYMENT_AR } from '@/lib/format';

const NEXT: Record<string, string[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['RETURNED'], CANCELLED: [], RETURNED: [],
};

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const token = () => getToken() ?? '';
  const [o, setO] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [track, setTrack] = useState({ trackingNumber: '', shippingCarrier: '' });
  const [note, setNote] = useState('');

  const load = () => apiGet(`/admin/orders/${id}`, { headers: { Authorization: `Bearer ${token()}` } }).then((d) => { setO(d); setTrack({ trackingNumber: d.trackingNumber || '', shippingCarrier: d.shippingCarrier || '' }); }).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, [id]);
  if (!o) return <p className="text-black/40">{msg || 'جارٍ التحميل…'}</p>;

  const changeStatus = async (status: string) => {
    setMsg('');
    try { await apiPost(`/admin/orders/${id}/status`, { status, note, ...track }, token()); setNote(''); load(); }
    catch (e: any) { setMsg(e.message); }
  };
  const setQty = async (variantId: number, quantity: number) => {
    const items = o.items.map((it: any) => ({ variantId: it.variantId, quantity: it.variantId === variantId ? quantity : it.quantity })).filter((i: any) => i.quantity > 0);
    try { await apiPost(`/admin/orders/${id}/items`, { items }, token()); load(); }
    catch (e: any) { setMsg(e.message); }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-extrabold">{o.orderNumber}</h1>
        <Link href={`/print/invoice/${id}`} target="_blank" className="btn-outline !py-1.5 text-sm">طباعة الفاتورة</Link>
      </div>
      {msg && <p className="text-red-600 mb-3">{msg}</p>}

      <div className="card p-4 mb-4 flex flex-wrap gap-4 items-center">
        <span className="bg-gold/15 text-gold-dark font-bold px-3 py-1 rounded">{ORDER_STATUS_AR[o.status] ?? o.status}</span>
        <span className="text-sm">{PAYMENT_AR[o.paymentMethod]} · {PAYMENT_AR[o.paymentStatus]}</span>
        <span className="font-extrabold text-gold-dark mr-auto">{money(o.total)}</span>
      </div>

      <div className="card p-4 mb-4">
        <h2 className="font-bold mb-2">العميل والعنوان</h2>
        <div className="text-sm text-black/70">{o.address?.fullName} — {o.address?.phone}</div>
        <div className="text-sm text-black/70">{[o.address?.city, o.address?.area, o.address?.street, o.address?.details].filter(Boolean).join(' · ')}</div>
        {o.customer && <div className="text-xs text-black/40 mt-1">حساب: {o.customer.email}</div>}
      </div>

      <div className="card p-4 mb-4">
        <h2 className="font-bold mb-3">العناصر {o.status === 'NEW' && <span className="text-xs text-black/40">(قابلة للتعديل)</span>}</h2>
        <table className="w-full text-sm">
          <tbody>
            {o.items.map((it: any) => (
              <tr key={it.id} className="border-b border-black/5">
                <td className="py-2">{it.productName} <span className="text-black/40">({it.sku})</span></td>
                <td className="py-2 w-24">
                  {o.status === 'NEW'
                    ? <input type="number" min={0} defaultValue={it.quantity} className="input w-20 !py-1" onBlur={(e) => Number(e.target.value) !== it.quantity && setQty(it.variantId, Number(e.target.value))} />
                    : <span>×{it.quantity}</span>}
                </td>
                <td className="py-2 text-left">{money(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-sm text-black/60 mt-3 space-y-1">
          <div>المجموع الفرعي: {money(o.subtotal)}</div>
          {Number(o.discount) > 0 && <div>الخصم: -{money(o.discount)}</div>}
          {Number(o.taxAmount) > 0 && <div>الضريبة: {money(o.taxAmount)}</div>}
          <div>الشحن: {money(o.shippingCost)}</div>
        </div>
      </div>

      <div className="card p-4 mb-4 grid sm:grid-cols-2 gap-2">
        <h2 className="font-bold sm:col-span-2">الشحن والملاحظات</h2>
        <input className="input" placeholder="شركة الشحن" value={track.shippingCarrier} onChange={(e) => setTrack({ ...track, shippingCarrier: e.target.value })} />
        <input className="input" placeholder="رقم التتبّع" value={track.trackingNumber} onChange={(e) => setTrack({ ...track, trackingNumber: e.target.value })} />
        <textarea className="input sm:col-span-2" placeholder="ملاحظة داخلية على تغيير الحالة" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="card p-4">
        <h2 className="font-bold mb-3">تغيير الحالة</h2>
        <div className="flex flex-wrap gap-2">
          {NEXT[o.status]?.map((s) => (
            <button key={s} onClick={() => changeStatus(s)} className="btn-gold !py-1.5 !px-3 text-sm">→ {ORDER_STATUS_AR[s] ?? s}</button>
          ))}
          {!NEXT[o.status]?.length && <span className="text-sm text-black/40">لا إجراءات متاحة</span>}
        </div>
        {o.statusHistory?.length > 0 && (
          <div className="mt-4 text-sm text-black/60">
            <h3 className="font-bold mb-1">السجل</h3>
            <ul className="space-y-0.5">
              {o.statusHistory.map((h: any) => <li key={h.id}>• {ORDER_STATUS_AR[h.status] ?? h.status}{h.note ? ` — ${h.note}` : ''}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
