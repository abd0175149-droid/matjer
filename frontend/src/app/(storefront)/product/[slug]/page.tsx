import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import AddToCart from '@/components/AddToCart';
import { money, GOLD_TYPE_AR } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: { slug: string } }) {
  let product: any;
  try {
    product = await apiGet(`/products/${params.slug}`);
  } catch {
    notFound();
  }

  const image = product.images?.[0]?.imageUrl ?? null;
  const variants = (product.variants ?? []).map((v: any) => ({
    id: v.id,
    sku: v.sku,
    color: v.color,
    size: v.size,
    price: v.price,
    available: v.available,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 my-6">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Gallery */}
        <div className="card aspect-square bg-black/5">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-black/30">لا صورة</div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="text-sm text-gold-dark mb-1">
            {GOLD_TYPE_AR[product.goldType] ?? ''} · {product.category?.name}
          </div>
          <h1 className="text-2xl font-extrabold mb-3">{product.name}</h1>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-extrabold text-gold-dark">{money(product.price)}</span>
            {product.discountPrice != null && Number(product.discountPrice) < Number(product.basePrice) && (
              <span className="text-black/40 line-through">{money(product.basePrice)}</span>
            )}
          </div>

          {product.description && <p className="text-black/70 mb-6 leading-relaxed">{product.description}</p>}

          <AddToCart productName={product.name} slug={product.slug} image={image} variants={variants} />

          {product.attributes && (
            <div className="mt-6 text-sm">
              <h3 className="font-bold mb-2">المواصفات</h3>
              <ul className="space-y-1 text-black/70">
                {Object.entries(product.attributes).map(([k, v]) => (
                  <li key={k}>• {k}: {String(v)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
