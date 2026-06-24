'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sheet } from '@/components/ui/Sheet';
import { apiGet } from '@/lib/api';
import { useCart } from '@/store/cart';
import { money, GOLD_TYPE_AR } from '@/lib/format';

// نظرة سريعة على المنتج (mds/13 §4) — تُفتح من بطاقة المنتج
export default function QuickView({ slug, open, onClose }: { slug: string; open: boolean; onClose: () => void }) {
  const add = useCart((s) => s.add);
  const openCart = useCart((s) => s.openCart);
  const [p, setP] = useState<any>(null);
  const [variantId, setVariantId] = useState<number>();
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open || p) return;
    apiGet(`/products/${slug}`).then((d) => { setP(d); setVariantId(d.variants?.[0]?.id); }).catch((e) => setErr(e.message));
  }, [open, slug]);

  const variant = p?.variants?.find((v: any) => v.id === variantId) ?? p?.variants?.[0];

  const addToCart = () => {
    if (!variant) return;
    add({ variantId: variant.id, productName: p.name, slug: p.slug, image: p.images?.[0]?.imageUrl ?? null, price: Number(variant.price), quantity: 1, color: variant.color, size: variant.size });
    onClose();
    openCart();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} side="end" title="نظرة سريعة">
      {err && <p className="text-danger">{err}</p>}
      {!p ? (
        <div className="space-y-3">
          <div className="aspect-square rounded-xl bg-muted animate-pulse" />
          <div className="h-5 w-2/3 bg-muted animate-pulse rounded" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="aspect-square rounded-xl bg-muted overflow-hidden">
            {p.images?.[0] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.images[0].imageUrl} alt={p.name} className="w-full h-full object-cover" />}
          </div>
          <div className="text-xs text-gold-deep">{GOLD_TYPE_AR[p.goldType] ?? ''} · {p.category?.name}</div>
          <h3 className="font-extrabold text-lg">{p.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-gold-deep">{money(variant?.price ?? p.price)}</span>
            {p.discountPrice && Number(p.discountPrice) < Number(p.basePrice) && <span className="line-through text-muted-foreground text-sm">{money(p.basePrice)}</span>}
          </div>
          {p.variants?.length > 1 && (
            <select className="input" value={variantId} onChange={(e) => setVariantId(Number(e.target.value))}>
              {p.variants.map((v: any) => <option key={v.id} value={v.id} disabled={v.available < 1}>{[v.color, v.size].filter(Boolean).join(' - ') || v.sku}{v.available < 1 ? ' (نفد)' : ''}</option>)}
            </select>
          )}
          <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>
          <div className="flex gap-2">
            <button className="btn-gold flex-1" onClick={addToCart} disabled={(variant?.available ?? 0) < 1}>أضف إلى السلة</button>
            <Link href={`/product/${p.slug}`} onClick={onClose} className="btn-outline">التفاصيل</Link>
          </div>
        </div>
      )}
    </Sheet>
  );
}
