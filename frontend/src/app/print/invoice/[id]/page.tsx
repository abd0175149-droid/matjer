'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { money, PAYMENT_AR } from '@/lib/format';

export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const [o, setO] = useState<any>(null);

  useEffect(() => {
    apiGet(`/admin/orders/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((d) => { setO(d); setTimeout(() => window.print(), 600); })
      .catch(() => {});
  }, [id]);

  if (!o) return <div className="p-8">جارٍ التحميل…</div>;

  return (
    <div dir="rtl" className="max-w-2xl mx-auto p-8 text-black bg-white">
      <div className="flex justify-between items-start border-b-2 border-gold pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gold-dark">متجر الذهب</h1>
          <p className="text-sm text-black/60">فاتورة ضريبية مبسّطة</p>
        </div>
        <div className="text-left text-sm">
          <div className="font-bold">{o.orderNumber}</div>
          <div className="text-black/60">{new Date(o.createdAt).toLocaleString('ar')}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <h3 className="font-bold mb-1">العميل</h3>
          <div>{o.address?.fullName}</div>
          <div>{o.address?.phone}</div>
          <div>{[o.address?.city, o.address?.area, o.address?.street].filter(Boolean).join('، ')}</div>
        </div>
        <div className="text-left">
          <h3 className="font-bold mb-1">الدفع</h3>
          <div>{PAYMENT_AR[o.paymentMethod]}</div>
          <div>{PAYMENT_AR[o.paymentStatus]}</div>
        </div>
      </div>

      <table className="w-full text-sm border-collapse mb-6">
        <thead><tr className="bg-gold/10 text-right">
          <th className="p-2 border border-black/10">المنتج</th>
          <th className="p-2 border border-black/10">الكمية</th>
          <th className="p-2 border border-black/10">السعر</th>
          <th className="p-2 border border-black/10">الإجمالي</th>
        </tr></thead>
        <tbody>
          {o.items.map((it: any) => (
            <tr key={it.id}>
              <td className="p-2 border border-black/10">{it.productName}</td>
              <td className="p-2 border border-black/10">{it.quantity}</td>
              <td className="p-2 border border-black/10">{money(it.unitPrice)}</td>
              <td className="p-2 border border-black/10">{money(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <table className="text-sm">
          <tbody>
            <tr><td className="p-1 pl-8 text-black/60">المجموع الفرعي</td><td className="p-1 font-bold">{money(o.subtotal)}</td></tr>
            {Number(o.discount) > 0 && <tr><td className="p-1 pl-8 text-black/60">الخصم</td><td className="p-1">-{money(o.discount)}</td></tr>}
            {Number(o.taxAmount) > 0 && <tr><td className="p-1 pl-8 text-black/60">الضريبة</td><td className="p-1">{money(o.taxAmount)}</td></tr>}
            <tr><td className="p-1 pl-8 text-black/60">الشحن</td><td className="p-1">{money(o.shippingCost)}</td></tr>
            <tr className="border-t border-black/20"><td className="p-1 pl-8 font-extrabold">الإجمالي</td><td className="p-1 font-extrabold text-gold-dark">{money(o.total)}</td></tr>
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-black/40 mt-10">شكراً لتسوّقك من متجر الذهب</p>
    </div>
  );
}
