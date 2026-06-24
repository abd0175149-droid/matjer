'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';

const CATS = [
  { slug: 'sets', name: 'أطقم' },
  { slug: 'rings', name: 'خواتم' },
  { slug: 'bracelets', name: 'أساور' },
  { slug: 'necklaces', name: 'قلادات' },
];

export default function Header() {
  const router = useRouter();
  const count = useCart((s) => s.count());
  const user = useAuth((s) => s.user);
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => setMounted(true), []);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="bg-white border-b border-black/5 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="text-2xl font-extrabold text-gold-dark whitespace-nowrap">
          متجـر <span className="text-ink">الذهب</span>
        </Link>

        <form onSubmit={search} className="hidden md:block flex-1 max-w-sm">
          <input
            className="input !py-2 text-sm"
            placeholder="ابحث عن منتج..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>

        <nav className="hidden lg:flex items-center gap-4 text-sm font-medium">
          {CATS.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="hover:text-gold-dark transition">{c.name}</Link>
          ))}
          <Link href="/track" className="hover:text-gold-dark transition">تتبّع</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href={mounted && user ? '/account' : '/login'} className="text-sm font-medium hover:text-gold-dark">
            {mounted && user ? `حسابي` : 'دخول'}
          </Link>
          <Link href="/cart" className="relative btn-gold !px-4 !py-2 text-sm">
            السلة
            {mounted && count > 0 && (
              <span className="absolute -top-2 -left-2 bg-ink text-white text-xs rounded-full w-5 h-5 grid place-items-center">{count}</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
