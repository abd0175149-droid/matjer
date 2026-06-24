'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { money } from '@/lib/format';

const STATUS_AR: Record<string, string> = { PENDING: 'معلّق', PARTIAL: 'مستلم جزئي', RECEIVED: 'مستلم', CANCELLED: 'ملغي' };

export default function AdminProcurement() {
  const token = () => getToken() ?? '';
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [sup, setSup] = useState({ name: '', contact: '' });
  const [po, setPo] = useState({ supplierId: '', variantId: '', quantity: '', unitCost: '' });
  const [msg, setMsg] = useState('');

  const load = () => {
    apiGet('/admin/procurement/suppliers', { headers: { Authorization: `Bearer ${token()}` } }).then(setSuppliers).catch((e) => setMsg(e.message));
    apiGet('/admin/procurement/orders', { headers: { Authorization: `Bearer ${token()}` } }).then(setOrders).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const addSupplier = async () => { await apiPost('/admin/procurement/suppliers', sup, token()); setSup({ name: '', contact: '' }); load(); };
  const createPO = async () => {
    setMsg('');
    try {
      await apiPost('/admin/procurement/orders', {
        supplierId: Number(po.supplierId),
        items: [{ variantId: Number(po.variantId), quantity: Number(po.quantity), unitCost: Number(po.unitCost) }],
      }, token());
      setPo({ supplierId: '', variantId: '', quantity: '', unitCost: '' });
      load();
    } catch (e: any) { setMsg(e.message); }
  };
  const receive = async (id: number) => { await apiPost(`/admin/procurement/orders/${id}/receive`, undefined, token()); load(); };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">المشتريات والموردون</h1>
      {msg && <p className="text-red-600 mb-3">{msg}</p>}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card p-4">
          <h2 className="font-bold mb-3">إضافة مورّد</h2>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input className="input" placeholder="الاسم" value={sup.name} onChange={(e) => setSup({ ...sup, name: e.target.value })} />
            <input className="input" placeholder="التواصل" value={sup.contact} onChange={(e) => setSup({ ...sup, contact: e.target.value })} />
          </div>
          <button className="btn-outline" onClick={addSupplier}>+ مورّد</button>
          <ul className="text-sm mt-3 space-y-1">
            {suppliers.map((s) => <li key={s.id}>#{s.id} — {s.name} {s.contact ? `(${s.contact})` : ''}</li>)}
          </ul>
        </div>

        <div className="card p-4">
          <h2 className="font-bold mb-3">أمر شراء جديد</h2>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <select className="input" value={po.supplierId} onChange={(e) => setPo({ ...po, supplierId: e.target.value })}>
              <option value="">المورّد</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="input" placeholder="رقم المتغيّر" value={po.variantId} onChange={(e) => setPo({ ...po, variantId: e.target.value })} />
            <input className="input" type="number" placeholder="الكمية" value={po.quantity} onChange={(e) => setPo({ ...po, quantity: e.target.value })} />
            <input className="input" type="number" placeholder="تكلفة الوحدة" value={po.unitCost} onChange={(e) => setPo({ ...po, unitCost: e.target.value })} />
          </div>
          <button className="btn-gold" onClick={createPO}>إنشاء أمر شراء</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-black/5 text-right"><tr><th className="p-3">#</th><th className="p-3">المورّد</th><th className="p-3">العناصر</th><th className="p-3">التكلفة</th><th className="p-3">الحالة</th><th className="p-3"></th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-black/5">
                <td className="p-3">{o.id}</td>
                <td className="p-3">{o.supplier?.name}</td>
                <td className="p-3">{o.items?.length}</td>
                <td className="p-3">{money(o.totalCost)}</td>
                <td className="p-3">{STATUS_AR[o.status] ?? o.status}</td>
                <td className="p-3">{o.status !== 'RECEIVED' && <button onClick={() => receive(o.id)} className="text-green-600 text-xs font-bold">استلام</button>}</td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan={6} className="p-4 text-center text-black/40">لا أوامر شراء</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
