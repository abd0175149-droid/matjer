'use client';

export default function ShareButtons({ title }: { title: string }) {
  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard?.writeText(url);
      alert('تم نسخ الرابط');
    }
  };
  const wa = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
  };

  return (
    <div className="flex gap-2 mt-3">
      <button onClick={wa} className="btn-outline !py-1.5 !px-3 text-sm">واتساب</button>
      <button onClick={share} className="btn-outline !py-1.5 !px-3 text-sm">مشاركة / نسخ الرابط</button>
    </div>
  );
}
