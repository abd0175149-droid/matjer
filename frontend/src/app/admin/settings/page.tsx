'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';

const FIELDS: { key: string; label: string }[] = [
  { key: 'store_name', label: 'اسم المتجر' },
  { key: 'currency', label: 'العملة (رمز ISO)' },
  { key: 'currency_symbol', label: 'رمز العملة' },
  { key: 'tax_rate', label: 'نسبة الضريبة %' },
  { key: 'shipping_flat', label: 'رسوم الشحن الثابتة' },
  { key: 'free_shipping_threshold', label: 'شحن مجاني فوق (0=معطّل)' },
];

export default function AdminSettings() {
  const token = () => getToken() ?? '';
  const [s, setS] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => { apiGet('/admin/settings', { headers: { Authorization: `Bearer ${token()}` } }).then(setS).catch((e) => setMsg(e.message)); }, []);

  const save = async () => {
    setMsg('');
    try { await apiSend('PATCH', '/admin/settings', s, token()); setMsg('تم الحفظ ✓'); }
    catch (e: any) { setMsg(e.message); }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold mb-6">إعدادات المتجر</h1>
      {msg && <p className="text-gold-dark mb-3">{msg}</p>}
      <div className="card p-4 space-y-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-bold mb-1">{f.label}</label>
            <input className="input" value={s[f.key] ?? ''} onChange={(e) => setS({ ...s, [f.key]: e.target.value })} />
          </div>
        ))}
        <button className="btn-gold" onClick={save}>حفظ الإعدادات</button>
      </div>
    </div>
  );
}
