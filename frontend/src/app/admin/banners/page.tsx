'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiSend } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { uploadImage } from '@/lib/upload';

export default function AdminBanners() {
  const token = () => getToken() ?? '';
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', imageUrl: '', link: '' });
  const [msg, setMsg] = useState('');

  const load = () => apiGet('/admin/banners', { headers: { Authorization: `Bearer ${token()}` } }).then(setList).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { setForm({ ...form, imageUrl: await uploadImage(file) }); } catch (err: any) { setMsg(err.message); }
  };
  const create = async () => {
    if (!form.imageUrl) { setMsg('ارفع صورة أولاً'); return; }
    await apiPost('/admin/banners', form, token());
    setForm({ title: '', imageUrl: '', link: '' }); load();
  };
  const del = async (id: number) => { await apiSend('DELETE', `/admin/banners/${id}`, undefined, token()); load(); };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">البانرات</h1>
      {msg && <p className="text-red-600 mb-3">{msg}</p>}
      <div className="card p-4 mb-6 grid sm:grid-cols-2 gap-3">
        <input className="input" placeholder="العنوان (اختياري)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input" placeholder="رابط عند الضغط (اختياري)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
        <div className="sm:col-span-2"><input type="file" accept="image/*" onChange={onUpload} /></div>
        {form.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={form.imageUrl} alt="" className="h-24 rounded sm:col-span-2" />}
        <button className="btn-gold sm:col-span-2" onClick={create}>+ إضافة بانر</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {list.map((b) => (
          <div key={b.id} className="card p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.imageUrl} alt={b.title || ''} className="w-full h-32 object-cover rounded mb-2" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">{b.title || '—'}</span>
              <button onClick={() => del(b.id)} className="text-red-600 text-xs">حذف</button>
            </div>
          </div>
        ))}
        {!list.length && <p className="text-black/40">لا بانرات</p>}
      </div>
    </div>
  );
}
