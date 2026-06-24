'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearToken, getToken } from '@/lib/admin-auth';

const NAV = [
  { href: '/admin', label: 'لوحة المعلومات' },
  { href: '/admin/products', label: 'المنتجات' },
  { href: '/admin/orders', label: 'الطلبات' },
  { href: '/admin/inventory', label: 'المخزون' },
  { href: '/admin/procurement', label: 'المشتريات' },
  { href: '/admin/customers', label: 'العملاء' },
  { href: '/admin/reviews', label: 'المراجعات' },
  { href: '/admin/coupons', label: 'الكوبونات' },
  { href: '/admin/reports', label: 'التقارير' },
  { href: '/admin/banners', label: 'البانرات' },
  { href: '/admin/pages', label: 'الصفحات' },
  { href: '/admin/users', label: 'المستخدمون' },
  { href: '/admin/settings', label: 'الإعدادات' },
  { href: '/admin/security', label: 'الأمان (2FA)' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    if (!isLogin && !getToken()) {
      router.replace('/admin/login');
    } else {
      setReady(true);
    }
  }, [isLogin, router]);

  if (isLogin) return <div className="min-h-screen grid place-items-center bg-ink">{children}</div>;
  if (!ready) return <div className="min-h-screen grid place-items-center text-black/40">جارٍ التحميل…</div>;

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-ink text-white p-4 shrink-0">
        <div className="text-xl font-extrabold text-gold-light mb-6">لوحة الإدارة</div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`block px-3 py-2 rounded-lg ${pathname === n.href ? 'bg-gold text-white' : 'hover:bg-white/10'}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => {
            clearToken();
            router.replace('/admin/login');
          }}
          className="mt-8 text-sm text-white/60 hover:text-white"
        >
          تسجيل الخروج
        </button>
      </aside>
      <div className="flex-1 bg-[#faf8f4] p-6">{children}</div>
    </div>
  );
}
