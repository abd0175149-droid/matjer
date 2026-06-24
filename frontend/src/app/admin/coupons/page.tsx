'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiSend } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';

export default function AdminCoupons() {
  const token = () => getToken() ?? '';
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ code: '', type: 'PERCENT', value: '', minOrder: '', usageLimit: '' });
  const [msg, setMsg] = useState('');

  const load = () => apiGet('/admin/coupons', { headers: { Authorization: `Bearer ${token()}` } }).then(setList).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setMsg('');
    try {
      await apiPost('/admin/coupons', {
        code: form.code, type: form.type, value: Number(form.value),
        minOrder: Number(form.minOrder || 0), usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      }, token());
      setForm({ code: '', type: 'PERCENT', value: '', minOrder: '', usageLimit: '' });
      load();
    } catch (e: any) { setMsg(e.message); }
  };
  const del = async (id: number) => { await apiSend('DELETE', `/admin/coupons/${id}`, undefined, token()); load(); };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">الكوبونات</h1>
      {msg && <p className="text-red-600 mb-3">{msg}</p>}
      <div className="card p-4 mb-6 grid sm:grid-cols-5 gap-2">
        <input className="input" placeholder="الكود" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="PERCENT">نسبة %</option><option value="AMOUNT">مبلغ</option>
        </select>
        <input className="input" type="number" placeholder="القيمة" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        <input className="input" type="number" placeholder="حد أدنى" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
        <input className="input" type="number" placeholder="حد الاستخدام" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
        <button className="btn-gold sm:col-span-5" onClick={create}>+ إضافة كوبون</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-black/5 text-right"><tr><th className="p-3">الكود</th><th className="p-3">النوع</th><th className="p-3">القيمة</th><th className="p-3">الاستخدام</th><th className="p-3"></th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t border-black/5">
                <td className="p-3 font-bold">{c.code}</td>
                <td className="p-3">{c.type === 'PERCENT' ? 'نسبة' : 'مبلغ'}</td>
                <td className="p-3">{c.value}</td>
                <td className="p-3">{c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ''}</td>
                <td className="p-3"><button onClick={() => del(c.id)} className="text-red-600 text-xs">حذف</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
