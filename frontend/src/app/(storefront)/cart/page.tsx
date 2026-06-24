'use client';
import Link from 'next/link';
import { useCart } from '@/store/cart';
import { money } from '@/lib/format';

export default function CartPage() {
  const { items, setQty, remove, subtotal } = useCart();

  if (!items.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 my-20 text-center">
        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gold-soft grid place-items-center text-4xl">🛍️</div>
        <h1 className="text-2xl font-extrabold mb-2">سلّتك فارغة</h1>
        <p className="text-muted-foreground mb-6">ابدأ التسوّق واكتشف تشكيلتنا من الذهب التقليدي.</p>
        <Link href="/" className="btn-gold inline-block">تصفّح المنتجات</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 my-6">
      <h1 className="text-2xl font-extrabold mb-4">سلّة التسوّق</h1>
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i.variantId} className="card p-3 flex items-center gap-3">
            <div className="w-20 h-20 bg-black/5 rounded-lg overflow-hidden shrink-0">
              {i.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.image} alt={i.productName} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1">
              <Link href={`/product/${i.slug}`} className="font-bold hover:text-gold-dark">
                {i.productName}
              </Link>
              <div className="text-sm text-black/50">
                {[i.color, i.size].filter(Boolean).join(' - ')}
              </div>
              <div className="text-gold-dark font-bold mt-1">{money(i.price)}</div>
            </div>
            <input
              type="number"
              min={1}
              value={i.quantity}
              onChange={(e) => setQty(i.variantId, Number(e.target.value))}
              className="input w-20"
            />
            <button onClick={() => remove(i.variantId)} className="text-red-600 text-sm px-2">
              حذف
            </button>
          </div>
        ))}
      </div>

      <div className="card p-4 mt-6 flex items-center justify-between">
        <div>
          <div className="text-sm text-black/50">المجموع الفرعي</div>
          <div className="text-2xl font-extrabold text-gold-dark">{money(subtotal())}</div>
        </div>
        <Link href="/checkout" className="btn-gold">
          متابعة للدفع
        </Link>
      </div>
    </div>
  );
}
