'use client';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '@/store/cart';
import { Sheet } from '@/components/ui/Sheet';
import { money } from '@/lib/format';

export default function CartDrawer() {
  const { items, isOpen, closeCart, setQty, remove, subtotal } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && closeCart()} side="start" title={`السلة (${items.length})`}>
      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">🛍️</div>
          سلّتك فارغة
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex-1 space-y-3">
            <AnimatePresence initial={false}>
              {items.map((i) => (
                <motion.div
                  key={i.variantId}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-3 items-center"
                >
                  <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                    {i.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={i.image} alt={i.productName} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${i.slug}`} onClick={closeCart} className="font-bold text-sm line-clamp-1 hover:text-gold-deep">{i.productName}</Link>
                    <div className="text-gold-deep font-bold text-sm">{money(i.price)}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => setQty(i.variantId, i.quantity - 1)} className="w-6 h-6 rounded bg-muted">−</button>
                      <span className="text-sm w-6 text-center">{i.quantity}</span>
                      <button onClick={() => setQty(i.variantId, i.quantity + 1)} className="w-6 h-6 rounded bg-muted">+</button>
                      <button onClick={() => remove(i.variantId)} className="text-danger text-xs mr-auto">حذف</button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="border-t pt-4 mt-4 space-y-3">
            <div className="flex justify-between font-extrabold">
              <span>المجموع</span>
              <span className="text-gold-deep">{money(subtotal())}</span>
            </div>
            <Link href="/checkout" onClick={closeCart} className="btn-gold w-full">متابعة للدفع</Link>
            <Link href="/cart" onClick={closeCart} className="block text-center text-sm text-muted-foreground hover:text-gold-deep">عرض السلة كاملة</Link>
          </div>
        </div>
      )}
    </Sheet>
  );
}
