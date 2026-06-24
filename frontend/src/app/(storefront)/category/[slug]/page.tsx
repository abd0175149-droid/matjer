import Link from 'next/link';
import { apiGet } from '@/lib/api';
import ProductCard, { ProductCardData } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

const CAT_NAMES: Record<string, string> = { sets: 'أطقم', rings: 'خواتم', bracelets: 'أساور', necklaces: 'قلادات' };
const SORTS = [
  { key: 'newest', label: 'الأحدث' },
  { key: 'price_asc', label: 'السعر ↑' },
  { key: 'price_desc', label: 'السعر ↓' },
  { key: 'best_selling', label: 'الأكثر مبيعاً' },
];

export default async function CategoryPage({
  params, searchParams,
}: { params: { slug: string }; searchParams: Record<string, string> }) {
  const sort = searchParams.sort || 'newest';
  const page = Math.max(1, Number(searchParams.page || 1));
  const qs = new URLSearchParams({ categorySlug: params.slug, sort, limit: '12', page: String(page) });
  for (const k of ['goldType', 'color', 'size', 'inStock'] as const) if (searchParams[k]) qs.set(k, searchParams[k]);

  let data: { items: ProductCardData[]; total: number } = { items: [], total: 0 };
  let opts: { colors: string[]; sizes: string[] } = { colors: [], sizes: [] };
  try { data = await apiGet(`/products?${qs.toString()}`); } catch { /* */ }
  try { opts = await apiGet('/products/filter-options'); } catch { /* */ }

  const base = `/category/${params.slug}`;
  const withParam = (k: string, v: string) => {
    const sp = new URLSearchParams(searchParams as any); sp.set(k, v); sp.delete('page'); return `${base}?${sp.toString()}`;
  };
  const toggle = (k: string, v: string) => {
    const sp = new URLSearchParams(searchParams as any);
    if (sp.get(k) === v) sp.delete(k); else sp.set(k, v);
    sp.delete('page'); return `${base}?${sp.toString()}`;
  };
  const totalPages = Math.ceil(data.total / 12);

  return (
    <div className="max-w-6xl mx-auto px-4 my-6">
      <h1 className="text-2xl font-extrabold mb-1">{CAT_NAMES[params.slug] ?? params.slug}</h1>
      <p className="text-black/50 text-sm mb-4">{data.total} منتج</p>

      <div className="flex flex-wrap gap-2 mb-3 text-sm">
        <Link href={base} className={`px-3 py-1.5 rounded-lg border ${!searchParams.goldType ? 'bg-gold text-white border-gold' : 'border-black/15'}`}>الكل</Link>
        <Link href={toggle('goldType', 'RUSSIAN')} className={`px-3 py-1.5 rounded-lg border ${searchParams.goldType === 'RUSSIAN' ? 'bg-gold text-white border-gold' : 'border-black/15'}`}>روسي</Link>
        <Link href={toggle('goldType', 'CHINESE')} className={`px-3 py-1.5 rounded-lg border ${searchParams.goldType === 'CHINESE' ? 'bg-gold text-white border-gold' : 'border-black/15'}`}>صيني</Link>
        <Link href={toggle('inStock', 'true')} className={`px-3 py-1.5 rounded-lg border ${searchParams.inStock === 'true' ? 'bg-ink text-white border-ink' : 'border-black/15'}`}>المتوفّر فقط</Link>
      </div>

      {(opts.colors.length > 0 || opts.sizes.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          {opts.colors.map((c) => (
            <Link key={c} href={toggle('color', c)} className={`px-2.5 py-1 rounded-full border ${searchParams.color === c ? 'bg-gold text-white border-gold' : 'border-black/15'}`}>{c}</Link>
          ))}
          {opts.sizes.map((s) => (
            <Link key={s} href={toggle('size', s)} className={`px-2.5 py-1 rounded-full border ${searchParams.size === s ? 'bg-gold text-white border-gold' : 'border-black/15'}`}>مقاس {s}</Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6 text-sm">
        {SORTS.map((s) => (
          <Link key={s.key} href={withParam('sort', s.key)} className={`px-3 py-1.5 rounded-lg border ${sort === s.key ? 'bg-ink text-white border-ink' : 'border-black/15'}`}>{s.label}</Link>
        ))}
      </div>

      {data.items.length ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.items.map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={withParam('page', String(n))} className={`w-9 h-9 grid place-items-center rounded-lg border ${n === page ? 'bg-gold text-white border-gold' : 'border-black/15'}`}>{n}</Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-black/50 py-10 text-center">لا توجد منتجات مطابقة.</p>
      )}
    </div>
  );
}
