'use client';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { money } from '@/lib/format';

export default function AdminReports() {
  const h = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });
  const [sales, setSales] = useState<any>(null);
  const [top, setTop] = useState<any[]>([]);
  const [inv, setInv] = useState<any>(null);
  const [cust, setCust] = useState<any>(null);
  const [profit, setProfit] = useState<any>(null);
  const [range, setRange] = useState({ from: '', to: '' });

  const load = () => {
    const q = new URLSearchParams(); if (range.from) q.set('from', range.from); if (range.to) q.set('to', range.to);
    const s = q.toString() ? `?${q}` : '';
    apiGet(`/admin/reports/sales${s}`, h()).then(setSales).catch(() => {});
    apiGet(`/admin/reports/profit${s}`, h()).then(setProfit).catch(() => {});
    apiGet('/admin/reports/top-products', h()).then(setTop).catch(() => {});
    apiGet('/admin/reports/inventory', h()).then(setInv).catch(() => {});
    apiGet('/admin/reports/customers', h()).then(setCust).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const exportCsv = async () => {
    const q = new URLSearchParams(); if (range.from) q.set('from', range.from); if (range.to) q.set('to', range.to);
    const res = await fetch(`/api/admin/reports/orders.csv?${q}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const blob = await res.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'orders.csv'; a.click();
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">التقارير</h1>

      <div className="card p-3 mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-bold">الفترة:</span>
        <input className="input w-auto" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <input className="input w-auto" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        <button className="btn-gold !py-1.5" onClick={load}>تطبيق</button>
        <button className="btn-outline !py-1.5 mr-auto" onClick={exportCsv}>تصدير الطلبات CSV</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card p-4"><div className="text-sm text-black/50">إيراد الفترة</div><div className="text-xl font-extrabold text-gold-dark">{money(sales?.periodRevenue ?? 0)}</div></div>
        <div className="card p-4"><div className="text-sm text-black/50">ربح تقديري</div><div className="text-xl font-extrabold text-green-700">{money(profit?.grossProfit ?? 0)}</div></div>
        <div className="card p-4"><div className="text-sm text-black/50">طلبات الفترة</div><div className="text-xl font-extrabold">{sales?.periodOrders ?? 0}</div></div>
        <div className="card p-4"><div className="text-sm text-black/50">قيمة المخزون</div><div className="text-xl font-extrabold">{money(inv?.stock_value ?? 0)}</div></div>
        <div className="card p-4"><div className="text-sm text-black/50">العملاء</div><div className="text-xl font-extrabold">{cust?.totalCustomers ?? 0}</div></div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="font-bold mb-3">الأكثر مبيعاً</h2>
          <ul className="text-sm space-y-1">
            {top.map((p) => <li key={p.id} className="flex justify-between"><span>{p.name}</span><span className="font-bold">{p.salesCount}</span></li>)}
            {!top.length && <li className="text-black/40">لا بيانات</li>}
          </ul>
        </div>
        <div className="card p-4">
          <h2 className="font-bold mb-3">أفضل العملاء</h2>
          <ul className="text-sm space-y-1">
            {cust?.topCustomers?.map((c: any, i: number) => <li key={i} className="flex justify-between"><span>{c.name}</span><span className="font-bold">{money(c.spent)}</span></li>)}
            {!cust?.topCustomers?.length && <li className="text-black/40">لا بيانات</li>}
          </ul>
        </div>
      </div>

      <div className="card p-4 mt-6">
        <h2 className="font-bold mb-3">المبيعات آخر 30 يوماً</h2>
        <div className="flex items-end gap-1 h-32">
          {sales?.byDay?.map((d: any) => {
            const max = Math.max(...sales.byDay.map((x: any) => x.revenue), 1);
            return <div key={d.day} title={`${d.day}: ${money(d.revenue)}`} className="flex-1 bg-gold rounded-t" style={{ height: `${(d.revenue / max) * 100}%` }} />;
          })}
          {!sales?.byDay?.length && <span className="text-black/40 text-sm">لا مبيعات بعد</span>}
        </div>
      </div>
    </div>
  );
}
