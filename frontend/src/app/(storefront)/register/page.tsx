'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuth((s) => s.register);
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(f.name, f.email, f.phone, f.password);
      router.push('/account');
    } catch (err: any) {
      setError(err.message || 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 my-12">
      <form onSubmit={submit} className="card p-8">
        <h1 className="text-2xl font-extrabold mb-6 text-center">إنشاء حساب</h1>
        <input className="input mb-3" placeholder="الاسم" value={f.name} onChange={(e) => set('name', e.target.value)} />
        <input className="input mb-3" type="email" placeholder="البريد الإلكتروني" value={f.email} onChange={(e) => set('email', e.target.value)} />
        <input className="input mb-3" placeholder="رقم الهاتف" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        <input className="input mb-4" type="password" placeholder="كلمة المرور (6 أحرف فأكثر)" value={f.password} onChange={(e) => set('password', e.target.value)} />
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button className="btn-gold w-full" disabled={loading}>{loading ? '...' : 'إنشاء حساب'}</button>
        <p className="text-center text-sm mt-4 text-black/60">
          لديك حساب؟ <Link href="/login" className="text-gold-dark font-bold">سجّل الدخول</Link>
        </p>
      </form>
    </div>
  );
}
