import Link from 'next/link';
import { apiGet } from '@/lib/api';
import ProductCard, { ProductCardData } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

const CATS = [
  { slug: 'sets', name: 'أطقم', emoji: '💍' },
  { slug: 'rings', name: 'خواتم', emoji: '💍' },
  { slug: 'bracelets', name: 'أساور', emoji: '📿' },
  { slug: 'necklaces', name: 'قلادات', emoji: '✨' },
];

function Section({ title, items }: { title: string; items: ProductCardData[] }) {
  if (!items?.length) return null;
  return (
    <section className="my-8">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.slice(0, 8).map((p) => <ProductCard key={p.slug} p={p} />)}
      </div>
    </section>
  );
}

export default async function HomePage() {
  let sections: any = { featured: [], bestSelling: [], newest: [], onSale: [] };
  let banners: any[] = [];
  try { sections = await apiGet('/products/sections'); } catch { /* */ }
  try { banners = await apiGet('/banners'); } catch { /* */ }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Banners or default hero */}
      {banners.length ? (
        <section className="my-6 grid gap-3">
          {banners.slice(0, 1).map((b) => (
            <a key={b.id} href={b.link || '#'} className="block rounded-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt={b.title || ''} className="w-full max-h-72 object-cover" />
            </a>
          ))}
        </section>
      ) : (
        <section className="my-6 rounded-2xl bg-gradient-to-l from-gold-dark to-gold text-white p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">إكسسوارات الذهب التقليدي</h1>
          <p className="text-white/90 max-w-xl mb-6">أطقم وخواتم وأساور وقلادات — ذهب روسي وصيني بأسعار ثابتة وجودة مضمونة.</p>
          <Link href="/category/sets" className="bg-white text-gold-dark font-bold rounded-lg px-6 py-3 inline-block">تسوّق الآن</Link>
        </section>
      )}

      <section className="my-8">
        <h2 className="text-xl font-bold mb-4">التصنيفات</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATS.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="card p-6 text-center hover:border-gold transition">
              <div className="text-3xl mb-2">{c.emoji}</div>
              <div className="font-bold">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      <Section title="منتجات مميّزة" items={sections.featured} />
      <Section title="وصل حديثاً" items={sections.newest} />
      <Section title="الأكثر مبيعاً" items={sections.bestSelling} />
      <Section title="عروض وخصومات" items={sections.onSale} />

      <section className="my-10 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
        {['شحن سريع', 'دفع عند الاستلام', 'ضمان الجودة', 'إرجاع سهل'].map((t) => (
          <div key={t} className="card py-4 font-bold text-gold-dark">{t}</div>
        ))}
      </section>
    </div>
  );
}
