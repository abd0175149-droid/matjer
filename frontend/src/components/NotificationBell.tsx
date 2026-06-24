'use client';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { apiGet, apiPost } from '@/lib/api';
import { enablePush } from '@/lib/push';

export default function NotificationBell() {
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => setMounted(true), []);

  const load = () => {
    if (!token) return;
    apiGet('/notifications', { headers: { Authorization: `Bearer ${token}` } }).then(setItems).catch(() => {});
    apiGet('/notifications/unread-count', { headers: { Authorization: `Bearer ${token}` } }).then((r) => setUnread(r.count)).catch(() => {});
  };
  useEffect(() => { if (mounted && token) load(); }, [mounted, token]);

  if (!mounted || !user) return null;

  const toggle = () => {
    const n = !open; setOpen(n);
    if (n && unread > 0 && token) { apiPost('/notifications/read', {}, token).then(() => setUnread(0)).catch(() => {}); }
  };

  const onEnable = async () => {
    setMsg('');
    try { await enablePush(token!); setMsg('تم تفعيل إشعارات هذا الجهاز ✓'); }
    catch (e: any) { setMsg(e.message); }
  };

  return (
    <div className="relative">
      <button onClick={toggle} className="relative w-9 h-9 grid place-items-center rounded-lg hover:bg-muted transition" aria-label="الإشعارات">
        <Bell size={18} />
        {unread > 0 && <span className="absolute -top-1 -start-1 bg-danger text-white text-[10px] rounded-full min-w-4 h-4 px-1 grid place-items-center font-bold">{unread}</span>}
      </button>
      {open && (
        <div className="absolute top-full end-0 mt-2 w-80 card card-luxe z-50 overflow-hidden">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="font-bold text-sm">الإشعارات</span>
            <button onClick={onEnable} className="text-xs text-gold-deep font-bold">تفعيل إشعارات الجهاز</button>
          </div>
          {msg && <div className="px-3 py-2 text-xs text-gold-deep">{msg}</div>}
          <div className="max-h-80 overflow-y-auto">
            {items.length ? items.map((n) => (
              <div key={n.id} className="px-3 py-2.5 border-b last:border-0 hover:bg-muted/50">
                <div className="font-bold text-sm">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
              </div>
            )) : <div className="px-3 py-8 text-center text-sm text-muted-foreground">لا إشعارات بعد</div>}
          </div>
        </div>
      )}
    </div>
  );
}
