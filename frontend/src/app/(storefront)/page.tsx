import Link from 'next/link';
import { ShieldCheck, Truck, RotateCcw, BadgeCheck } from 'lucide-react';
import { apiGet } from '@/lib/api';
import ProductCard, { ProductCardData } from '@/components/ProductCard';
import Reveal from '@/components/ui/Reveal';

export const dynamic = 'force-dynamic';

const CATS = [
  { slug: 'sets', name: 'أطقم', img: 'https://picsum.photos/seed/setcat/600/600' },
  { slug: 'rings', name: 'خواتم', img: 'https://picsum.photos/seed/ringcat/600/600' },
  { slug: 'bracelets', name: 'أساور', img: 'https://picsum.photos/seed/brccat/600/600' },
  { slug: 'necklaces', name: 'قلادات', img: 'https://picsum.photos/seed/nckcat/600/600' },
];

function Section({ title, items, href }: { title: string; items: ProductCardData[]; href?: string }) {
  if (!items?.length) return null;
  return (
    <Reveal className="my-12">
      <div className="flex items-end justify-between mb-5">
        <h2 className="text-2xl font-extrabold">{title}</h2>
        {href && <Link href={href} className="text-sm text-gold-deep font-bold">عرض الكل ←</Link>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.slice(0, 8).map((p) => <ProductCard key={p.slug} p={p} />)}
      </div>
    </Reveal>
  );
}

export default async function HomePage() {
  let sections: any = { featured: [], bestSelling: [], newest: [], onSale: [] };
  let banners: any[] = [];
  try { sections = await apiGet('/products/sections'); } catch { /* */ }
  try { banners = await apiGet('/banners'); } catch { /* */ }

  return (
    <div className="container-x">
      {/* Hero */}
      {banners.length ? (
        <section className="my-6 rounded-3xl overflow-hidden card-luxe">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href={banners[0].link || '#'}><img src={banners[0].imageUrl} alt={banners[0].title || ''} className="w-full max-h-[420px] object-cover" /></a>
        </section>
      ) : (
        <section className="my-6 rounded-3xl overflow-hidden relative card-luxe">
          <div className="relative px-8 py-16 md:px-16 md:py-24 text-white" style={{ background: 'linear-gradient(135deg, var(--gold-deep), var(--gold))' }}>
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 0, transparent 40%)' }} />
            <div className="relative max-w-xl">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">إكسسوارات الذهب التقليدي</h1>
              <p className="text-white/90 text-lg mb-8">أطقم وخواتم وأساور وقلادات — ذهب روسي وصيني بأسعار ثابتة وجودة مضمونة.</p>
              <Link href="/category/sets" className="bg-white text-gold-deep font-extrabold rounded-xl px-8 py-3.5 inline-block hover:scale-105 transition-transform">تسوّق الآن</Link>
            </div>
          </div>
        </section>
      )}

      {/* Bento categories */}
      <Reveal className="my-12">
        <h2 className="text-2xl font-extrabold mb-5">تسوّق حسب الفئة</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATS.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="group relative aspect-square rounded-2xl overflow-hidden card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.img} alt={c.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <span className="absolute bottom-4 start-4 text-white text-xl font-extrabold">{c.name}</span>
            </Link>
          ))}
        </div>
      </Reveal>

      <Section title="منتجات مميّزة" items={sections.featured} />
      <Section title="وصل حديثاً" items={sections.newest} href="/category/sets?sort=newest" />
      <Section title="الأكثر مبيعاً" items={sections.bestSelling} href="/category/sets?sort=best_selling" />
      <Section title="عروض وخصومات" items={sections.onSale} />

      {/* Trust bar */}
      <Reveal className="my-14 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Truck, t: 'شحن سريع' },
          { icon: BadgeCheck, t: 'دفع عند الاستلام' },
          { icon: ShieldCheck, t: 'ضمان الجودة' },
          { icon: RotateCcw, t: 'إرجاع سهل' },
        ].map(({ icon: Icon, t }) => (
          <div key={t} className="card p-5 flex items-center gap-3">
            <Icon className="text-gold-deep" />
            <span className="font-bold">{t}</span>
          </div>
        ))}
      </Reveal>
    </div>
  );
}
