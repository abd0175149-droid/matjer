'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiSend } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';

export default function AdminUsers() {
  const token = () => getToken() ?? '';
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', roleId: '' });
  const [msg, setMsg] = useState('');

  const load = () => {
    apiGet('/admin/users', { headers: { Authorization: `Bearer ${token()}` } }).then(setUsers).catch((e) => setMsg(e.message));
    apiGet('/admin/roles', { headers: { Authorization: `Bearer ${token()}` } }).then(setRoles).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setMsg('');
    try {
      await apiPost('/admin/users', { ...form, roleId: Number(form.roleId) }, token());
      setForm({ name: '', email: '', phone: '', password: '', roleId: '' });
      load();
    } catch (e: any) { setMsg(e.message); }
  };
  const toggle = async (id: number, isActive: boolean) => { await apiSend('PATCH', `/admin/users/${id}`, { isActive: !isActive }, token()); load(); };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">المستخدمون والأدوار</h1>
      {msg && <p className="text-red-600 mb-3">{msg}</p>}

      <div className="card p-4 mb-6 grid sm:grid-cols-3 gap-2">
        <input className="input" placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="البريد" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" placeholder="الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="input" type="password" placeholder="كلمة المرور" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select className="input" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
          <option value="">الدور</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.description || r.name}</option>)}
        </select>
        <button className="btn-gold" onClick={create}>+ إضافة موظف</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-black/5 text-right"><tr><th className="p-3">الاسم</th><th className="p-3">البريد</th><th className="p-3">الدور</th><th className="p-3">الحالة</th><th className="p-3"></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-black/5">
                <td className="p-3 font-bold">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.isActive ? '✅' : '⛔'}</td>
                <td className="p-3"><button onClick={() => toggle(u.id, u.isActive)} className="text-gold-dark text-xs">{u.isActive ? 'تعطيل' : 'تفعيل'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
