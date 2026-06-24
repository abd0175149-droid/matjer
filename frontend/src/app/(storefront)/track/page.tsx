'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Package, ClipboardCheck, Truck, Home, Search } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { money, ORDER_STATUS_AR } from '@/lib/format';

const STEPS = [
  { key: 'NEW', label: 'جديد', icon: ClipboardCheck },
  { key: 'CONFIRMED', label: 'مؤكد', icon: Check },
  { key: 'PROCESSING', label: 'قيد التجهيز', icon: Package },
  { key: 'SHIPPED', label: 'مشحون', icon: Truck },
  { key: 'DELIVERED', label: 'مُسلّم', icon: Home },
];

export default function TrackPage() {
  const [id, setId] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async (uuid?: string) => {
    const key = (uuid ?? id).trim();
    if (!key) return;
    setLoading(true); setError(''); setOrder(null);
    try { setOrder(await apiGet(`/orders/track/${key}`)); }
    catch (e: any) { setError(e.message || 'لم يُعثر على الطلب'); }
    finally { setLoading(false); }
  };

  if (typeof window !== 'undefined' && !order && !loading && !error) {
    const u = new URLSearchParams(window.location.search).get('id');
    if (u && id !== u) { setId(u); search(u); }
  }

  const stepIdx = order ? STEPS.findIndex((s) => s.key === order.status) : -1;
  const cancelled = order && ['CANCELLED', 'RETURNED'].includes(order.status);

  return (
    <div className="max-w-2xl mx-auto px-4 my-10">
      <h1 className="text-2xl font-extrabold mb-4">تتبّع الطلب</h1>
      <div className="flex gap-2 mb-8">
        <input className="input" placeholder="أدخل رمز التتبّع (UUID)" value={id} onChange={(e) => setId(e.target.value)} />
        <button className="btn-gold whitespace-nowrap" onClick={() => search()} disabled={loading}>
          <Search size={16} /> {loading ? '...' : 'بحث'}
        </button>
      </div>

      {error && <p className="text-danger">{error}</p>}

      {order && (
        <div className="card card-luxe p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="text-sm text-muted-foreground">رقم الطلب</div>
              <div className="font-extrabold text-lg">{order.orderNumber}</div>
            </div>
            <span className="bg-gold-soft text-gold-deep font-bold px-3 py-1.5 rounded-lg">{ORDER_STATUS_AR[order.status] ?? order.status}</span>
          </div>

          {cancelled ? (
            <div className="text-center py-6 text-danger font-bold">حالة الطلب: {ORDER_STATUS_AR[order.status]}</div>
          ) : (
            <div className="flex justify-between items-start relative mb-8">
              <div className="absolute top-5 inset-x-5 h-0.5 bg-border" />
              <motion.div className="absolute top-5 end-5 h-0.5 bg-gold origin-right"
                initial={{ scaleX: 0 }} animate={{ scaleX: stepIdx / (STEPS.length - 1) }}
                transition={{ duration: 0.8, ease: 'easeOut' }} style={{ left: '1.25rem' }} />
              {STEPS.map((s, i) => {
                const done = i <= stepIdx;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                    <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ delay: i * 0.08 }}
                      className={`w-10 h-10 rounded-full grid place-items-center border-2 ${done ? 'bg-gold border-gold text-white' : 'bg-card border-border text-muted-foreground'}`}>
                      <Icon size={18} />
                    </motion.div>
                    <span className={`text-xs text-center ${done ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          <ul className="space-y-2 text-sm border-t pt-4">
            {order.items.map((it: any) => (
              <li key={it.id} className="flex justify-between"><span>{it.productName} ×{it.quantity}</span><span>{money(it.total)}</span></li>
            ))}
          </ul>
          <div className="border-t mt-3 pt-3 flex justify-between font-extrabold">
            <span>الإجمالي</span><span className="text-gold-deep">{money(order.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
