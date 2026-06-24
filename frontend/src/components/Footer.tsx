export default function Footer() {
  return (
    <footer className="bg-ink text-white/80 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <h3 className="text-gold-light font-bold text-lg mb-2">متجر الذهب</h3>
          <p>إكسسوارات ذهب تقليدي (روسي وصيني) — أطقم، خواتم، أساور، قلادات بأسعار ثابتة.</p>
        </div>
        <div>
          <h4 className="font-bold mb-2 text-white">روابط</h4>
          <ul className="space-y-1">
            <li>الشحن والتوصيل</li>
            <li>سياسة الإرجاع والاستبدال</li>
            <li>الضمان</li>
            <li>من نحن</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-2 text-white">مزايا</h4>
          <ul className="space-y-1">
            <li>✓ دفع آمن</li>
            <li>✓ الدفع عند الاستلام</li>
            <li>✓ إرجاع سهل</li>
            <li>✓ ضمان الجودة</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} متجر الذهب — جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
