import Link from 'next/link';
import { apiGet } from '@/lib/api';
import ProductCard, { ProductCardData } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

const CAT_NAMES: Record<string, string> = {
  sets: 'أطقم',
  rings: 'خواتم',
  bracelets: 'أساور',
  necklaces: 'قلادات',
};

const SORTS = [
  { key: 'newest', label: 'الأحدث' },
  { key: 'price_asc', label: 'السعر: تصاعدي' },
  { key: 'price_desc', label: 'السعر: تنازلي' },
  { key: 'best_selling', label: 'الأكثر مبيعاً' },
];

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { sort?: string; goldType?: string };
}) {
  const sort = searchParams.sort || 'newest';
  const qs = new URLSearchParams({ categorySlug: params.slug, sort, limit: '24' });
  if (searchParams.goldType) qs.set('goldType', searchParams.goldType);

  let data: { items: ProductCardData[]; total: number } = { items: [], total: 0 };
  try {
    data = await apiGet(`/products?${qs.toString()}`);
  } catch {
    /* ignore */
  }

  const base = `/category/${params.slug}`;

  return (
    <div className="max-w-6xl mx-auto px-4 my-6">
      <h1 className="text-2xl font-extrabold mb-1">{CAT_NAMES[params.slug] ?? params.slug}</h1>
      <p className="text-black/50 text-sm mb-4">{data.total} منتج</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6 text-sm">
        <Link href={base} className={`px-3 py-1.5 rounded-lg border ${!searchParams.goldType ? 'bg-gold text-white border-gold' : 'border-black/15'}`}>
          الكل
        </Link>
        <Link href={`${base}?goldType=RUSSIAN`} className={`px-3 py-1.5 rounded-lg border ${searchParams.goldType === 'RUSSIAN' ? 'bg-gold text-white border-gold' : 'border-black/15'}`}>
          روسي
        </Link>
        <Link href={`${base}?goldType=CHINESE`} className={`px-3 py-1.5 rounded-lg border ${searchParams.goldType === 'CHINESE' ? 'bg-gold text-white border-gold' : 'border-black/15'}`}>
          صيني
        </Link>
        <span className="mx-2 text-black/20">|</span>
        {SORTS.map((s) => {
          const sp = new URLSearchParams(searchParams as any);
          sp.set('sort', s.key);
          return (
            <Link key={s.key} href={`${base}?${sp.toString()}`} className={`px-3 py-1.5 rounded-lg border ${sort === s.key ? 'bg-ink text-white border-ink' : 'border-black/15'}`}>
              {s.label}
            </Link>
          );
        })}
      </div>

      {data.items.length ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.items.map((p) => (
            <ProductCard key={p.slug} p={p} />
          ))}
        </div>
      ) : (
        <p className="text-black/50 py-10 text-center">لا توجد منتجات في هذا التصنيف بعد.</p>
      )}
    </div>
  );
}
