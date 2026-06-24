'use client';

const COLORS = [
  { name: 'gold', var: '--gold' },
  { name: 'gold-deep', var: '--gold-deep' },
  { name: 'gold-soft', var: '--gold-soft' },
  { name: 'background', var: '--background' },
  { name: 'foreground', var: '--foreground' },
  { name: 'muted', var: '--muted' },
  { name: 'border', var: '--border' },
  { name: 'success', var: '--success' },
  { name: 'danger', var: '--danger' },
];

export default function DesignSystem() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">نظام التصميم (mds/13)</h1>
        <p className="text-muted-foreground text-sm">مرجع الألوان والمكوّنات. كل القيم design tokens (CSS variables) قابلة للتخصيص من «المظهر».</p>
      </div>

      <section>
        <h2 className="font-bold mb-3">الألوان (Tokens)</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {COLORS.map((c) => (
            <div key={c.name} className="text-center">
              <div className="h-16 rounded-xl border" style={{ background: `var(${c.var})` }} />
              <div className="text-xs mt-1 font-bold">{c.name}</div>
              <code className="text-[10px] text-muted-foreground">{c.var}</code>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-3">الطباعة</h2>
        <div className="space-y-1">
          <p className="text-4xl font-extrabold">عنوان رئيسي · Display</p>
          <p className="text-2xl font-bold">عنوان فرعي · H2</p>
          <p className="text-base">نص أساسي بخط Tajawal — body text.</p>
          <p className="text-sm text-muted-foreground">نص ثانوي · small muted.</p>
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-3">الأزرار والشارات</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-gold">زر ذهبي</button>
          <button className="btn-outline">زر محدّد</button>
          <span className="bg-gold-soft text-gold-deep px-3 py-1 rounded-full text-sm font-bold">شارة</span>
          <span className="bg-danger text-white px-2 py-1 rounded text-xs font-bold">خصم</span>
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-3">البطاقات والحقول</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="card p-4">بطاقة قياسية <code>.card</code></div>
          <div className="card card-luxe p-4">بطاقة فاخرة <code>.card-luxe</code></div>
          <input className="input sm:col-span-2" placeholder="حقل إدخال .input" />
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-3">الزوايا والظلال والحركة</h2>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• الزوايا: <code>--radius: 1rem</code> (bento/cards)</li>
          <li>• الظل الفاخر: <code>--shadow-luxe</code></li>
          <li>• منحنى الحركة: <code>--ease-luxe: cubic-bezier(0.22,1,0.36,1)</code></li>
          <li>• كل الحركات تحترم <code>prefers-reduced-motion</code></li>
        </ul>
      </section>
    </div>
  );
}
