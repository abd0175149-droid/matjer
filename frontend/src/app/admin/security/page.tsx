'use client';
import { useState } from 'react';
import { apiPost } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';

export default function AdminSecurity() {
  const token = () => getToken() ?? '';
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  const setup = async () => {
    setMsg('');
    try { const r = await apiPost('/auth/2fa/setup', undefined, token()); setQr(r.qr); }
    catch (e: any) { setMsg(e.message); }
  };
  const enable = async () => {
    setMsg('');
    try { await apiPost('/auth/2fa/enable', { code }, token()); setMsg('تم تفعيل التحقق الثنائي ✓'); setQr(''); }
    catch (e: any) { setMsg(e.message); }
  };
  const disable = async () => {
    setMsg('');
    try { await apiPost('/auth/2fa/disable', { code }, token()); setMsg('تم التعطيل'); }
    catch (e: any) { setMsg(e.message); }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-extrabold mb-6">الأمان — التحقق الثنائي (2FA)</h1>
      {msg && <p className="text-gold-dark mb-3">{msg}</p>}
      <div className="card p-5 space-y-4">
        <p className="text-sm text-black/60">فعّل التحقق الثنائي عبر تطبيق Google Authenticator أو ما يماثله.</p>
        <button className="btn-outline" onClick={setup}>1) إنشاء رمز الإعداد</button>
        {qr && (
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR" className="mx-auto w-44 h-44" />
            <p className="text-xs text-black/50 mt-1">امسح الرمز ثم أدخل الكود لتأكيد التفعيل</p>
          </div>
        )}
        <input className="input" placeholder="الرمز من التطبيق (6 أرقام)" value={code} onChange={(e) => setCode(e.target.value)} />
        <div className="flex gap-2">
          <button className="btn-gold" onClick={enable}>تفعيل</button>
          <button className="btn-outline" onClick={disable}>تعطيل</button>
        </div>
      </div>
    </div>
  );
}
