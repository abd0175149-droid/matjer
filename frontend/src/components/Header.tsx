'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingBag, User, Menu } from 'lucide-react';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import SearchBox from '@/components/SearchBox';
import ThemeSwitcher from '@/components/ThemeSwitcher';

const CATS = [
  { slug: 'sets', name: 'أطقم' },
  { slug: 'rings', name: 'خواتم' },
  { slug: 'bracelets', name: 'أساور' },
  { slug: 'necklaces', name: 'قلادات' },
];

export default function Header() {
  const count = useCart((s) => s.count());
  const openCart = useCart((s) => s.openCart);
  const user = useAuth((s) => s.user);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    h();
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <header className={`sticky top-0 z-40 transition-all ${scrolled ? 'glass border-b shadow-sm' : 'bg-background'}`}>
      <div className="container-x py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="lg:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="القائمة"><Menu /></button>
          <Link href="/" className="text-2xl font-extrabold text-gold-deep whitespace-nowrap">
            متجـر <span className="text-foreground">الذهب</span>
          </Link>
        </div>

        <div className="hidden md:block flex-1 max-w-sm"><SearchBox /></div>

        <nav className="hidden lg:flex items-center gap-4 text-sm font-medium">
          {CATS.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="hover:text-gold-deep transition relative after:absolute after:bottom-[-4px] after:start-0 after:h-0.5 after:w-0 after:bg-gold after:transition-all hover:after:w-full">{c.name}</Link>
          ))}
          <Link href="/track" className="hover:text-gold-deep transition">تتبّع</Link>
        </nav>

        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          <Link href={mounted && user ? '/account' : '/login'} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-muted transition" aria-label="حسابي"><User size={18} /></Link>
          <button onClick={openCart} className="relative w-9 h-9 grid place-items-center rounded-lg hover:bg-muted transition" aria-label="السلة">
            <ShoppingBag size={18} />
            {mounted && count > 0 && (
              <span className="absolute -top-1 -start-1 bg-gold text-primary-foreground text-[10px] rounded-full min-w-4 h-4 px-1 grid place-items-center font-bold">{count}</span>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="lg:hidden border-t bg-background px-4 py-3 flex flex-col gap-2 text-sm">
          <div className="mb-2"><SearchBox /></div>
          {CATS.map((c) => <Link key={c.slug} href={`/category/${c.slug}`} onClick={() => setMenuOpen(false)} className="py-1">{c.name}</Link>)}
          <Link href="/track" onClick={() => setMenuOpen(false)} className="py-1">تتبّع الطلب</Link>
        </nav>
      )}
    </header>
  );
}
