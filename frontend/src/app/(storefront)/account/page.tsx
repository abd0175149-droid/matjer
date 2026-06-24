'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, authHeader } from '@/store/auth';
import { apiGet, apiSend } from '@/lib/api';
import { money, ORDER_STATUS_AR } from '@/lib/format';

export default function AccountPage() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState<'orders' | 'wishlist' | 'addresses'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    apiGet('/orders/mine', { headers: authHeader() }).then(setOrders).catch(() => {});
    apiGet('/wishlist', { headers: authHeader() }).then(setWishlist).catch(() => {});
    apiGet('/account/addresses', { headers: authHeader() }).then(setAddresses).catch(() => {});
  }, [token]);

  const removeWish = async (productId: number) => {
    await apiSend('DELETE', `/wishlist/${productId}`, undefined, token!);
    setWishlist((w) => w.filter((x) => x.productId !== productId));
  };

  if (!token) return null;

  const tabs = [
    { k: 'orders', label: 'طلباتي' },
    { k: 'wishlist', label: 'المفضلة' },
    { k: 'addresses', label: 'عناويني' },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto px-4 my-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">مرحباً {user?.name}</h1>
        <button onClick={() => { logout(); router.push('/'); }} className="text-sm text-red-600">خروج</button>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === t.k ? 'bg-gold text-white' : 'card'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="card p-4 flex justify-between items-center">
              <div>
                <div className="font-bold">{o.orderNumber}</div>
                <div className="text-sm text-black/50">{o.items?.length} منتج · {money(o.total)}</div>
              </div>
              <span className="bg-gold/15 text-gold-dark text-sm font-bold px-3 py-1 rounded">{ORDER_STATUS_AR[o.status] ?? o.status}</span>
            </div>
          ))}
          {!orders.length && <p className="text-black/40">لا طلبات بعد</p>}
        </div>
      )}

      {tab === 'wishlist' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {wishlist.map((w) => (
            <div key={w.productId} className="card p-3">
              <Link href={`/product/${w.slug}`} className="block">
                <div className="aspect-square bg-black/5 rounded mb-2 overflow-hidden">
                  {w.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={w.image} alt={w.name} className="w-full h-full object-cover" />}
                </div>
                <div className="font-bold text-sm">{w.name}</div>
              </Link>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gold-dark font-bold">{money(w.price)}</span>
                <button onClick={() => removeWish(w.productId)} className="text-red-600 text-xs">إزالة</button>
              </div>
            </div>
          ))}
          {!wishlist.length && <p className="text-black/40 col-span-full">المفضلة فارغة</p>}
        </div>
      )}

      {tab === 'addresses' && (
        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="font-bold">{a.fullName} — {a.phone}</div>
              <div className="text-sm text-black/60">{[a.city, a.area, a.street, a.details].filter(Boolean).join(' · ')}</div>
            </div>
          ))}
          {!addresses.length && <p className="text-black/40">لا عناوين محفوظة (تُحفظ عند الطلب)</p>}
        </div>
      )}
    </div>
  );
}
