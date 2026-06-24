'use client';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import QuickView from '@/components/QuickView';
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
  const [qv, setQv] = useState(false);
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
      <Link href={`/product/${p.slug}`} className="card group block h-full hover:card-luxe transition-shadow">
        <div className="aspect-square bg-muted overflow-hidden relative">
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <div className="w-full h-full grid place-items-center text-muted-foreground">لا صورة</div>
          )}
          {hasDiscount && (
            <span className="absolute top-2 end-2 bg-danger text-white text-[11px] font-bold px-2 py-1 rounded-full">خصم</span>
          )}
          {p.inStock === false && (
            <span className="absolute inset-0 glass grid place-items-center font-bold">نفد المخزون</span>
          )}
          {/* نظرة سريعة */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQv(true); }}
            className="absolute top-2 start-2 w-9 h-9 rounded-full glass grid place-items-center opacity-0 group-hover:opacity-100 transition hover:text-gold-deep"
            aria-label="نظرة سريعة"
          >
            <Eye size={16} />
          </button>
          {/* شريط زجاجي للسعر يظهر عند hover */}
          <div className="absolute inset-x-0 bottom-0 glass px-3 py-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-between">
            <span className="text-gold-deep font-extrabold text-sm">{money(p.price)}</span>
            {hasDiscount && <span className="text-muted-foreground line-through text-xs">{money(p.basePrice)}</span>}
          </div>
        </div>
        <div className="p-3">
          <div className="text-[11px] text-gold-deep mb-1">{GOLD_TYPE_AR[p.goldType] ?? ''}</div>
          <h3 className="font-bold text-sm line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
          <div className="mt-2 flex items-center gap-2 sm:group-hover:opacity-0 transition-opacity">
            <span className="text-gold-deep font-extrabold">{money(p.price)}</span>
            {hasDiscount && <span className="text-muted-foreground line-through text-xs">{money(p.basePrice)}</span>}
          </div>
        </div>
      </Link>
      <QuickView slug={p.slug} open={qv} onClose={() => setQv(false)} />
    </motion.div>
  );
}
