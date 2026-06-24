'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import ProductReviews from '@/components/ProductReviews';

export default function ProductTabs({ description, attributes, productId }: { description?: string; attributes?: Record<string, any> | null; productId: number }) {
  const [tab, setTab] = useState<'desc' | 'specs' | 'reviews'>('desc');
  const tabs = [
    { k: 'desc', label: 'الوصف' },
    { k: 'specs', label: 'المواصفات' },
    { k: 'reviews', label: 'التقييمات' },
  ] as const;

  return (
    <div className="mt-12">
      <div className="flex gap-1 border-b mb-5">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`relative px-4 py-2.5 text-sm font-bold transition ${tab === t.k ? 'text-gold-deep' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
            {tab === t.k && <motion.span layoutId="tabunderline" className="absolute -bottom-px inset-x-0 h-0.5 bg-gold" />}
          </button>
        ))}
      </div>

      {tab === 'desc' && <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{description || 'لا يوجد وصف.'}</p>}

      {tab === 'specs' && (
        attributes && Object.keys(attributes).length ? (
          <table className="w-full text-sm max-w-md">
            <tbody>
              {Object.entries(attributes).map(([k, v]) => (
                <tr key={k} className="border-b">
                  <td className="py-2 font-bold text-muted-foreground">{k}</td>
                  <td className="py-2">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-muted-foreground">لا توجد مواصفات.</p>
      )}

      {tab === 'reviews' && <ProductReviews productId={productId} />}
    </div>
  );
}
