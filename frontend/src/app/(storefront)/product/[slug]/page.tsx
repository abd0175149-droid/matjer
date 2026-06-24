import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { apiGet } from '@/lib/api';
import AddToCart from '@/components/AddToCart';
import WishlistButton from '@/components/WishlistButton';
import ProductReviews from '@/components/ProductReviews';
import ProductGallery from '@/components/ProductGallery';
import ShareButtons from '@/components/ShareButtons';
import ProductCard, { ProductCardData } from '@/components/ProductCard';
import { money, GOLD_TYPE_AR } from '@/lib/format';

export const dynamic = 'force-dynamic';

async function getProduct(slug: string) {
  try { return await apiGet(`/products/${slug}`); } catch { return null; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getProduct(params.slug);
  if (!p) return { title: 'منتج' };
  return {
    title: `${p.name} — متجر الذهب`,
    description: p.description?.slice(0, 160) || p.name,
    openGraph: { title: p.name, images: p.images?.[0]?.imageUrl ? [p.images[0].imageUrl] : [] },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const images: string[] = (product.images ?? []).map((i: any) => i.imageUrl);
  const variants = (product.variants ?? []).map((v: any) => ({
    id: v.id, sku: v.sku, color: v.color, size: v.size, price: v.price, available: v.available,
  }));
  let related: ProductCardData[] = [];
  try { related = await apiGet(`/products/${params.slug}/related`); } catch { /* */ }

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name,
    description: product.description || product.name, image: images,
    offers: { '@type': 'Offer', price: Number(product.price), priceCurrency: 'JOD', availability: 'https://schema.org/InStock' },
    ...(product.avgRating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.avgRating } } : {}),
  };

  return (
    <div className="max-w-6xl mx-auto px-4 my-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid md:grid-cols-2 gap-8">
        <ProductGallery images={images} name={product.name} />
        <div>
          <div className="text-sm text-gold-dark mb-1">{GOLD_TYPE_AR[product.goldType] ?? ''} · {product.category?.name}</div>
          <h1 className="text-2xl font-extrabold mb-3">{product.name}</h1>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-extrabold text-gold-dark">{money(product.price)}</span>
            {product.discountPrice != null && Number(product.discountPrice) < Number(product.basePrice) && (
              <span className="text-black/40 line-through">{money(product.basePrice)}</span>
            )}
          </div>
          {product.description && <p className="text-black/70 mb-6 leading-relaxed">{product.description}</p>}
          <AddToCart productName={product.name} slug={product.slug} image={images[0] ?? null} variants={variants} />
          <div className="mt-3"><WishlistButton productId={product.id} /></div>
          <ShareButtons title={product.name} />
          {product.attributes && (
            <div className="mt-6 text-sm">
              <h3 className="font-bold mb-2">المواصفات</h3>
              <ul className="space-y-1 text-black/70">
                {Object.entries(product.attributes).map(([k, v]) => <li key={k}>• {k}: {String(v)}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      <ProductReviews productId={product.id} />

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">منتجات مشابهة</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
