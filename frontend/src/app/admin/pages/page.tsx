'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiSend } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';

export default function AdminPages() {
  const token = () => getToken() ?? '';
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ slug: '', title: '', content: '' });
  const [msg, setMsg] = useState('');

  const load = () => apiGet('/admin/pages', { headers: { Authorization: `Bearer ${token()}` } }).then(setList).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setMsg('');
    try { await apiPost('/admin/pages', form, token()); setForm({ slug: '', title: '', content: '' }); load(); }
    catch (e: any) { setMsg(e.message); }
  };
  const del = async (id: number) => { await apiSend('DELETE', `/admin/pages/${id}`, undefined, token()); load(); };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold mb-6">الصفحات الثابتة</h1>
      {msg && <p className="text-red-600 mb-3">{msg}</p>}
      <div className="card p-4 mb-6 space-y-2">
        <div className="grid sm:grid-cols-2 gap-2">
          <input className="input" placeholder="المعرّف (مثل: returns)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="input" placeholder="العنوان (سياسة الإرجاع)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <textarea className="input min-h-[120px]" placeholder="المحتوى" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        <button className="btn-gold" onClick={create}>+ إضافة صفحة</button>
      </div>
      <div className="space-y-2">
        {list.map((p) => (
          <div key={p.id} className="card p-3 flex justify-between items-center">
            <span><b>{p.title}</b> <span className="text-black/40 text-sm">/{p.slug}</span></span>
            <button onClick={() => del(p.id)} className="text-red-600 text-xs">حذف</button>
          </div>
        ))}
        {!list.length && <p className="text-black/40">لا صفحات</p>}
      </div>
    </div>
  );
}
