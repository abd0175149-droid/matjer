'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { setToken } from '@/lib/admin-auth';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiPost('/auth/login', { email, password });
      if (!['admin', 'sales', 'inventory', 'accountant'].includes(res.user.role)) {
        throw new Error('هذا الحساب ليس موظفاً');
      }
      setToken(res.accessToken);
      router.replace('/admin');
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-8 w-full max-w-sm">
      <h1 className="text-xl font-extrabold mb-6 text-center">دخول لوحة الإدارة</h1>
      <input className="input mb-3" type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input mb-4" type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <button className="btn-gold w-full" disabled={loading}>
        {loading ? 'جارٍ الدخول…' : 'دخول'}
      </button>
    </form>
  );
}
