import Link from 'next/link';
import { apiGet } from '@/lib/api';

export default async function Footer() {
  let pages: { slug: string; title: string }[] = [];
  try { pages = await apiGet('/pages'); } catch { /* */ }

  return (
    <footer className="text-white/75 mt-16" style={{ background: 'oklch(0.17 0.012 60)' }}>
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <h3 className="font-extrabold text-xl mb-2" style={{ color: 'var(--gold)' }}>متجر الذهب</h3>
          <p>إكسسوارات ذهب تقليدي (روسي وصيني) — أطقم، خواتم، أساور، قلادات بأسعار ثابتة.</p>
        </div>
        <div>
          <h4 className="font-bold mb-2 text-white">روابط</h4>
          <ul className="space-y-1">
            {pages.length ? pages.map((p) => (
              <li key={p.slug}><Link href={`/page/${p.slug}`} className="hover:text-gold-light">{p.title}</Link></li>
            )) : <li className="text-white/40">—</li>}
            <li><Link href="/track" className="hover:text-gold-light">تتبّع الطلب</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-2 text-white">مزايا</h4>
          <ul className="space-y-1"><li>✓ دفع آمن</li><li>✓ الدفع عند الاستلام</li><li>✓ إرجاع سهل</li><li>✓ ضمان الجودة</li></ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">© متجر الذهب — جميع الحقوق محفوظة.</div>
    </footer>
  );
}
