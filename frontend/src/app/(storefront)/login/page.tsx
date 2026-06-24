'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/account');
    } catch (err: any) {
      setError(err.message || 'فشل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 my-12">
      <form onSubmit={submit} className="card p-8">
        <h1 className="text-2xl font-extrabold mb-6 text-center">تسجيل الدخول</h1>
        <input className="input mb-3" type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input mb-4" type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button className="btn-gold w-full" disabled={loading}>{loading ? '...' : 'دخول'}</button>
        <p className="text-center text-sm mt-4 text-black/60">
          ليس لديك حساب؟ <Link href="/register" className="text-gold-dark font-bold">أنشئ حساباً</Link>
        </p>
      </form>
    </div>
  );
}
