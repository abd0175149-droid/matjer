'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';

export default function AdminInventory() {
  const token = () => getToken() ?? '';
  const [low, setLow] = useState<any[]>([]);
  const [form, setForm] = useState({ variantId: '', quantity: '', note: '' });
  const [mv, setMv] = useState({ variantId: '', type: 'IN', quantity: '', note: '' });
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

  const movement = async () => {
    setMsg('');
    try {
      await apiPost('/admin/inventory/movement', { variantId: Number(mv.variantId), type: mv.type, quantity: Number(mv.quantity), note: mv.note }, token());
      setMv({ variantId: '', type: 'IN', quantity: '', note: '' });
      setMsg('سُجّلت الحركة ✓');
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

      <div className="card p-4 mb-6">
        <h2 className="font-bold mb-3">حركة مخزون (إدخال/إخراج/تالف/تحويل)</h2>
        <div className="grid sm:grid-cols-5 gap-2">
          <input className="input" placeholder="رقم المتغيّر" value={mv.variantId} onChange={(e) => setMv({ ...mv, variantId: e.target.value })} />
          <select className="input" value={mv.type} onChange={(e) => setMv({ ...mv, type: e.target.value })}>
            <option value="IN">إدخال</option><option value="OUT">إخراج</option><option value="RETURN">مرتجع</option>
            <option value="DAMAGED">تالف</option><option value="TRANSFER">تحويل</option>
          </select>
          <input className="input" type="number" placeholder="الكمية" value={mv.quantity} onChange={(e) => setMv({ ...mv, quantity: e.target.value })} />
          <input className="input" placeholder="ملاحظة" value={mv.note} onChange={(e) => setMv({ ...mv, note: e.target.value })} />
          <button className="btn-gold" onClick={movement}>تسجيل</button>
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
