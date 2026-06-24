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

export default async function HomePage() {
  let featured: ProductCardData[] = [];
  try {
    featured = await apiGet<ProductCardData[]>('/products/featured');
  } catch {
    featured = [];
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Hero */}
      <section className="my-6 rounded-2xl bg-gradient-to-l from-gold-dark to-gold text-white p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">إكسسوارات الذهب التقليدي</h1>
        <p className="text-white/90 max-w-xl mb-6">
          أطقم وخواتم وأساور وقلادات — ذهب روسي وصيني بأسعار ثابتة وجودة مضمونة.
        </p>
        <Link href="/category/sets" className="bg-white text-gold-dark font-bold rounded-lg px-6 py-3 inline-block">
          تسوّق الآن
        </Link>
      </section>

      {/* Categories */}
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

      {/* Featured */}
      <section className="my-8">
        <h2 className="text-xl font-bold mb-4">منتجات مميّزة</h2>
        {featured.length ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        ) : (
          <p className="text-black/50">لا توجد منتجات مميّزة بعد.</p>
        )}
      </section>

      {/* Trust bar */}
      <section className="my-10 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
        {['شحن سريع', 'دفع عند الاستلام', 'ضمان الجودة', 'إرجاع سهل'].map((t) => (
          <div key={t} className="card py-4 font-bold text-gold-dark">
            {t}
          </div>
        ))}
      </section>
    </div>
  );
}
