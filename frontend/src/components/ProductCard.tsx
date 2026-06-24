import Link from 'next/link';
import { money, GOLD_TYPE_AR } from '@/lib/format';

export interface ProductCardData {
  slug: string;
  name: string;
  goldType: string;
  basePrice: number | string;
  discountPrice?: number | string | null;
  price: number | string;
  image: string | null;
  inStock?: boolean;
}

export default function ProductCard({ p }: { p: ProductCardData }) {
  const hasDiscount = p.discountPrice != null && Number(p.discountPrice) < Number(p.basePrice);
  return (
    <Link href={`/product/${p.slug}`} className="card group block">
      <div className="aspect-square bg-black/5 overflow-hidden relative">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
        ) : (
          <div className="w-full h-full grid place-items-center text-black/30">لا صورة</div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">خصم</span>
        )}
        {p.inStock === false && (
          <span className="absolute inset-0 bg-white/70 grid place-items-center font-bold text-ink">نفد المخزون</span>
        )}
      </div>
      <div className="p-3">
        <div className="text-xs text-gold-dark mb-1">{GOLD_TYPE_AR[p.goldType] ?? ''}</div>
        <h3 className="font-bold text-sm line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-gold-dark font-extrabold">{money(p.price)}</span>
          {hasDiscount && <span className="text-black/40 line-through text-xs">{money(p.basePrice)}</span>}
        </div>
      </div>
    </Link>
  );
}
