import { apiGet } from '@/lib/api';
import ProductCard, { ProductCardData } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || '').trim();
  let data: { items: ProductCardData[]; total: number } = { items: [], total: 0 };
  if (q) {
    try {
      data = await apiGet(`/products?q=${encodeURIComponent(q)}&limit=24`);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 my-6">
      <h1 className="text-2xl font-extrabold mb-1">نتائج البحث</h1>
      <p className="text-black/50 text-sm mb-6">
        {q ? `«${q}» — ${data.total} نتيجة` : 'اكتب كلمة للبحث'}
      </p>
      {data.items.length ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.items.map((p) => <ProductCard key={p.slug} p={p} />)}
        </div>
      ) : (
        q && <p className="text-black/50 py-10 text-center">لا نتائج لـ «{q}».</p>
      )}
    </div>
  );
}
