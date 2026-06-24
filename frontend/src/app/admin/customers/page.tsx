'use client';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { money } from '@/lib/format';

export default function AdminCustomers() {
  const [list, setList] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    apiGet('/admin/customers', { headers: { Authorization: `Bearer ${getToken()}` } }).then(setList).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">العملاء</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-black/5 text-right"><tr><th className="p-3">الاسم</th><th className="p-3">البريد</th><th className="p-3">الهاتف</th><th className="p-3">طلبات</th><th className="p-3">إجمالي الشراء</th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t border-black/5">
                <td className="p-3 font-bold">{c.name}</td>
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.phone}</td>
                <td className="p-3">{c.orders}</td>
                <td className="p-3 font-bold text-gold-dark">{money(c.total_spent)}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5} className="p-6 text-center text-black/40">لا عملاء بعد</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
