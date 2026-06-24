'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/store/cart';
import { apiPost } from '@/lib/api';
import { money } from '@/lib/format';

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const [form, setForm] = useState({ fullName: '', phone: '', city: '', area: '', street: '', details: '', notes: '' });
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'CARD'>('COD');
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ orderNumber: string; uuid: string } | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.fullName || !form.phone || !form.city) {
      setError('يرجى تعبئة الاسم والهاتف والمدينة');
      return;
    }
    setLoading(true);
    try {
      const res = await apiPost('/orders', {
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        paymentMethod,
        shipping: form,
        notes: form.notes,
        couponCode: couponCode.trim() || undefined,
      });
      clear();
      setDone({ orderNumber: res.orderNumber, uuid: res.uuid });
    } catch (e: any) {
      setError(e.message || 'تعذّر إتمام الطلب');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-2xl mx-auto px-4 my-16 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-extrabold mb-2">تم استلام طلبك!</h1>
        <p className="text-black/60 mb-1">رقم الطلب: <b>{done.orderNumber}</b></p>
        <p className="text-black/60 mb-6">احتفظ برمز التتبّع: <b className="break-all">{done.uuid}</b></p>
        <div className="flex gap-3 justify-center">
          <Link href={`/track?id=${done.uuid}`} className="btn-gold">تتبّع الطلب</Link>
          <Link href="/" className="btn-outline">العودة للمتجر</Link>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 my-16 text-center">
        <h1 className="text-xl font-bold mb-3">سلّتك فارغة</h1>
        <Link href="/" className="btn-gold inline-block">تصفّح المنتجات</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 my-6 grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <h1 className="text-2xl font-extrabold">إتمام الطلب</h1>
        <div className="card p-4 grid sm:grid-cols-2 gap-3">
          <input className="input" placeholder="الاسم الكامل *" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
          <input className="input" placeholder="رقم الهاتف *" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <input className="input" placeholder="المدينة *" value={form.city} onChange={(e) => set('city', e.target.value)} />
          <input className="input" placeholder="المنطقة" value={form.area} onChange={(e) => set('area', e.target.value)} />
          <input className="input sm:col-span-2" placeholder="الشارع" value={form.street} onChange={(e) => set('street', e.target.value)} />
          <textarea className="input sm:col-span-2" placeholder="تفاصيل إضافية للعنوان" value={form.details} onChange={(e) => set('details', e.target.value)} />
          <textarea className="input sm:col-span-2" placeholder="ملاحظات على الطلب" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        <div className="card p-4">
          <h3 className="font-bold mb-3">طريقة الدفع</h3>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input type="radio" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} />
            الدفع عند الاستلام (COD)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-black/40">
            <input type="radio" disabled checked={paymentMethod === 'CARD'} onChange={() => setPaymentMethod('CARD')} />
            بطاقة (قريباً)
          </label>
        </div>

        {error && <p className="text-red-600 font-bold">{error}</p>}
      </div>

      <div className="card p-4 h-fit">
        <h3 className="font-bold mb-3">ملخّص الطلب</h3>
        <input className="input mb-3 text-sm" placeholder="كوبون خصم (اختياري)" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
        <ul className="space-y-2 text-sm mb-3">
          {items.map((i) => (
            <li key={i.variantId} className="flex justify-between">
              <span>{i.productName} ×{i.quantity}</span>
              <span>{money(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t pt-3 flex justify-between font-extrabold text-gold-dark">
          <span>الإجمالي</span>
          <span>{money(subtotal())}</span>
        </div>
        <button className="btn-gold w-full mt-4" onClick={submit} disabled={loading}>
          {loading ? 'جارٍ التأكيد...' : 'تأكيد الطلب'}
        </button>
      </div>
    </div>
  );
}
