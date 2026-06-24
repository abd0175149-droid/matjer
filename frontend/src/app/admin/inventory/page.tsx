'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';

export default function AdminInventory() {
  const token = () => getToken() ?? '';
  const [low, setLow] = useState<any[]>([]);
  const [form, setForm] = useState({ variantId: '', quantity: '', note: '' });
  const [msg, setMsg] = useState('');

  const load = () => apiGet('/admin/inventory/low-stock', { headers: { Authorization: `Bearer ${token()}` } }).then(setLow).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  const adjust = async () => {
    setMsg('');
    try {
      await apiPost('/admin/inventory/adjust', { variantId: Number(form.variantId), quantity: Number(form.quantity), note: form.note }, token());
      setForm({ variantId: '', quantity: '', note: '' });
      setMsg('تمت التسوية ✓');
      load();
    } catch (e: any) { setMsg(e.message); }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">المخزون</h1>
      {msg && <p className="text-gold-dark mb-3">{msg}</p>}

      <div className="card p-4 mb-6">
        <h2 className="font-bold mb-3">تسوية كمية متغيّر</h2>
        <div className="grid sm:grid-cols-4 gap-2">
          <input className="input" placeholder="رقم المتغيّر (ID)" value={form.variantId} onChange={(e) => setForm({ ...form, variantId: e.target.value })} />
          <input className="input" type="number" placeholder="الكمية الجديدة" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input className="input" placeholder="السبب" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button className="btn-gold" onClick={adjust}>تسوية</button>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-bold mb-3">تنبيهات المخزون المنخفض</h2>
        <table className="w-full text-sm">
          <thead className="bg-black/5 text-right"><tr><th className="p-2">ID</th><th className="p-2">المنتج</th><th className="p-2">SKU</th><th className="p-2">المتاح</th><th className="p-2">الحد</th></tr></thead>
          <tbody>
            {low.map((v) => (
              <tr key={v.id} className="border-t border-black/5">
                <td className="p-2">{v.id}</td>
                <td className="p-2">{v.product_name}</td>
                <td className="p-2">{v.sku}</td>
                <td className="p-2 font-bold text-red-600">{v.stock_quantity - v.reserved_quantity}</td>
                <td className="p-2">{v.min_stock_alert}</td>
              </tr>
            ))}
            {!low.length && <tr><td colSpan={5} className="p-4 text-center text-black/40">لا تنبيهات</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
