'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/store/cart';
import { money } from '@/lib/format';

interface Variant {
  id: number;
  sku: string;
  color?: string | null;
  size?: string | null;
  price: number | string;
  available: number;
}
interface Props {
  productName: string;
  slug: string;
  image: string | null;
  variants: Variant[];
}

export default function AddToCart({ productName, slug, image, variants }: Props) {
  const add = useCart((s) => s.add);
  const openCart = useCart((s) => s.openCart);
  const router = useRouter();
  const [variantId, setVariantId] = useState<number>(variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);

  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const available = variant?.available ?? 0;

  const onAdd = () => {
    if (!variant || available < 1) return;
    add({
      variantId: variant.id,
      productName,
      slug,
      image,
      price: Number(variant.price),
      quantity: Math.min(qty, available),
      color: variant.color,
      size: variant.size,
    });
    setDone(true);
    openCart();
    setTimeout(() => setDone(false), 1800);
  };

  if (!variant) return <p className="text-red-600">لا تتوفّر خيارات لهذا المنتج حالياً.</p>;

  return (
    <div className="space-y-4">
      {variants.length > 1 && (
        <div>
          <label className="block text-sm font-bold mb-1">الخيار</label>
          <select className="input" value={variantId} onChange={(e) => setVariantId(Number(e.target.value))}>
            {variants.map((v) => (
              <option key={v.id} value={v.id} disabled={v.available < 1}>
                {[v.color, v.size].filter(Boolean).join(' - ') || v.sku} — {money(v.price)}
                {v.available < 1 ? ' (نفد)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="text-sm font-bold">الكمية</label>
        <input
          type="number"
          min={1}
          max={Math.max(1, available)}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          className="input w-24"
        />
        <span className="text-sm text-black/50">{available > 0 ? `متاح: ${available}` : 'نفد المخزون'}</span>
      </div>

      <div className="flex gap-3">
        <button className="btn-gold" onClick={onAdd} disabled={available < 1}>
          {done ? '✓ أُضيف' : 'أضف إلى السلة'}
        </button>
        <button className="btn-outline" onClick={() => { onAdd(); router.push('/cart'); }} disabled={available < 1}>
          اشترِ الآن
        </button>
      </div>

      {/* شريط لاصق على الجوال (mds/13 — sticky add-to-cart) */}
      <div className="fixed bottom-0 inset-x-0 z-30 sm:hidden glass border-t p-3 flex items-center gap-3">
        <div className="font-extrabold text-gold-deep">{money(variant.price)}</div>
        <button className="btn-gold flex-1" onClick={onAdd} disabled={available < 1}>
          {done ? '✓ أُضيف للسلة' : 'أضف إلى السلة'}
        </button>
      </div>
    </div>
  );
}
