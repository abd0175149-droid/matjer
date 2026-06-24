'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { uploadImage } from '@/lib/upload';

const PRESETS = [
  { name: 'ذهبي (افتراضي)', color: '#c9a24b' },
  { name: 'بلاتيني', color: '#8a93a6' },
  { name: 'وردي', color: '#c98a7a' },
  { name: 'زمرّدي', color: '#3f9e7a' },
  { name: 'ملكي', color: '#7a5cc9' },
];

export default function AdminAppearance() {
  const token = () => getToken() ?? '';
  const [s, setS] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => { apiGet('/admin/settings', { headers: { Authorization: `Bearer ${token()}` } }).then(setS).catch((e) => setMsg(e.message)); }, []);

  const save = async () => {
    setMsg('');
    try {
      await apiSend('PATCH', '/admin/settings', { store_name: s.store_name, store_logo: s.store_logo, primary_color: s.primary_color }, token());
      setMsg('تم الحفظ ✓ — حدّث صفحة المتجر لرؤية التغيير');
    } catch (e: any) { setMsg(e.message); }
  };
  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { setS({ ...s, store_logo: await uploadImage(f) }); } catch (err: any) { setMsg(err.message); }
  };

  const color = s.primary_color || '#c9a24b';

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold mb-2">المظهر وتخصيص الموقع</h1>
      <p className="text-muted-foreground text-sm mb-6">تتحكّم هذه الإعدادات بمظهر واجهة المتجر مباشرةً.</p>
      {msg && <p className="text-gold-deep mb-3">{msg}</p>}

      <div className="card p-5 space-y-5">
        <div>
          <label className="block text-sm font-bold mb-1">اسم المتجر</label>
          <input className="input" value={s.store_name ?? ''} onChange={(e) => setS({ ...s, store_name: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">لون العلامة (يُطبّق على كل الموقع)</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map((p) => (
              <button key={p.color} onClick={() => setS({ ...s, primary_color: p.color })}
                className={`w-10 h-10 rounded-full border-2 ${color.toLowerCase() === p.color.toLowerCase() ? 'border-foreground' : 'border-transparent'}`}
                style={{ background: p.color }} title={p.name} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input type="color" value={color} onChange={(e) => setS({ ...s, primary_color: e.target.value })} className="w-12 h-10 rounded cursor-pointer" />
            <input className="input flex-1" value={s.primary_color ?? ''} onChange={(e) => setS({ ...s, primary_color: e.target.value })} placeholder="#c9a24b أو oklch(...)" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">شعار المتجر</label>
          {s.store_logo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.store_logo} alt="logo" className="h-12 mb-2" />}
          <input type="file" accept="image/*" onChange={onLogo} />
        </div>

        <button className="btn-gold" onClick={save}>حفظ التخصيص</button>
      </div>

      <p className="text-xs text-muted-foreground mt-4">ملاحظات: الوضع الداكن/الفاتح يتحكم فيه الزائر من زر القمر في الهيدر. تُدار البانرات والصفحات والإعدادات الأخرى من أقسامها المخصّصة.</p>
    </div>
  );
}
