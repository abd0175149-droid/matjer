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
  { href: '/admin/appearance', label: 'المظهر والتخصيص' },
  { href: '/admin/design', label: 'نظام التصميم' },
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

  if (isLogin) return <div className="min-h-screen grid place-items-center" style={{ background: 'oklch(0.17 0.012 60)' }}>{children}</div>;
  if (!ready) return <div className="min-h-screen grid place-items-center text-muted-foreground">جارٍ التحميل…</div>;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-56 text-white p-4 shrink-0 sticky top-0 h-screen overflow-y-auto" style={{ background: 'oklch(0.17 0.012 60)' }}>
        <div className="text-xl font-extrabold mb-6" style={{ color: 'var(--gold)' }}>لوحة الإدارة</div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`block px-3 py-2 rounded-lg text-sm transition ${pathname === n.href ? 'text-white font-bold' : 'text-white/70 hover:bg-white/10'}`}
              style={pathname === n.href ? { background: 'var(--gold)' } : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => { clearToken(); router.replace('/admin/login'); }}
          className="mt-8 text-sm text-white/60 hover:text-white"
        >
          تسجيل الخروج
        </button>
      </aside>
      <div className="flex-1 p-6 overflow-x-hidden">{children}</div>
    </div>
  );
}
