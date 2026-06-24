'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [sugs, setSugs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) { setSugs([]); return; }
      try { setSugs(await apiGet(`/products/suggest?q=${encodeURIComponent(q.trim())}`)); setOpen(true); } catch { /* */ }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { setOpen(false); router.push(`/search?q=${encodeURIComponent(q.trim())}`); }
  };

  return (
    <div ref={box} className="relative w-full">
      <form onSubmit={go}>
        <input className="input !py-2 text-sm" placeholder="ابحث عن منتج..." value={q}
          onChange={(e) => setQ(e.target.value)} onFocus={() => sugs.length && setOpen(true)} />
      </form>
      {open && sugs.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-black/10 rounded-lg shadow-lg z-50 overflow-hidden">
          {sugs.map((s) => (
            <Link key={s.slug} href={`/product/${s.slug}`} onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gold/10 text-sm">
              <div className="w-8 h-8 bg-black/5 rounded overflow-hidden shrink-0">
                {s.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.image} alt="" className="w-full h-full object-cover" />}
              </div>
              <span>{s.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
