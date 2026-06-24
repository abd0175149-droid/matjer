'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/store/auth';
import { apiGet, apiPost } from '@/lib/api';

function Stars({ n }: { n: number }) {
  return <span className="text-gold">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

export default function ProductReviews({ productId }: { productId: number }) {
  const token = useAuth((s) => s.token);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => apiGet(`/reviews/product/${productId}`).then(setReviews).catch(() => {});
  useEffect(() => { load(); }, [productId]);

  const submit = async () => {
    setMsg('');
    try {
      await apiPost('/reviews', { productId, rating, comment }, token!);
      setComment('');
      setMsg('شكراً! مراجعتك بانتظار الموافقة.');
    } catch (e: any) {
      setMsg(e.message || 'تعذّر الإرسال');
    }
  };

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold mb-4">التقييمات والمراجعات</h2>

      {token ? (
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold">تقييمك:</span>
            <select className="input w-24" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} نجوم</option>)}
            </select>
          </div>
          <textarea className="input mb-3" placeholder="اكتب رأيك بالمنتج..." value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn-gold" onClick={submit}>إرسال المراجعة</button>
          {msg && <p className="text-sm text-gold-dark mt-2">{msg}</p>}
        </div>
      ) : (
        <p className="text-sm text-black/50 mb-6">سجّل الدخول لكتابة مراجعة.</p>
      )}

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm">{r.customer?.name ?? 'عميل'}</span>
              <Stars n={r.rating} />
            </div>
            {r.comment && <p className="text-black/70 text-sm mt-1">{r.comment}</p>}
          </div>
        ))}
        {!reviews.length && <p className="text-black/40 text-sm">لا مراجعات بعد — كن أول من يقيّم.</p>}
      </div>
    </div>
  );
}
