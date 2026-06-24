'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiSend } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';

export default function AdminReviews() {
  const token = () => getToken() ?? '';
  const [list, setList] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  const load = () => apiGet('/admin/reviews', { headers: { Authorization: `Bearer ${token()}` } }).then(setList).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  const approve = async (id: number) => { await apiPost(`/admin/reviews/${id}/approve`, undefined, token()); load(); };
  const del = async (id: number) => { await apiSend('DELETE', `/admin/reviews/${id}`, undefined, token()); load(); };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">المراجعات بانتظار الموافقة</h1>
      {msg && <p className="text-red-600 mb-3">{msg}</p>}
      <div className="space-y-3">
        {list.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex justify-between">
              <div>
                <span className="font-bold">{r.product?.name}</span> — <span className="text-black/60">{r.customer?.name}</span>
                <span className="text-gold mr-2">{'★'.repeat(r.rating)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approve(r.id)} className="text-green-600 text-sm font-bold">موافقة</button>
                <button onClick={() => del(r.id)} className="text-red-600 text-sm">حذف</button>
              </div>
            </div>
            {r.comment && <p className="text-black/70 text-sm mt-1">{r.comment}</p>}
          </div>
        ))}
        {!list.length && <p className="text-black/40">لا مراجعات معلّقة</p>}
      </div>
    </div>
  );
}
