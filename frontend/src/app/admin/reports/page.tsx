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

  useEffect(() => {
    apiGet('/admin/reports/sales', h()).then(setSales).catch(() => {});
    apiGet('/admin/reports/top-products', h()).then(setTop).catch(() => {});
    apiGet('/admin/reports/inventory', h()).then(setInv).catch(() => {});
    apiGet('/admin/reports/customers', h()).then(setCust).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">التقارير</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4"><div className="text-sm text-black/50">الإيراد المحصّل</div><div className="text-xl font-extrabold text-gold-dark">{money(sales?.paidRevenue ?? 0)}</div></div>
        <div className="card p-4"><div className="text-sm text-black/50">طلبات مدفوعة</div><div className="text-xl font-extrabold">{sales?.paidOrders ?? 0}</div></div>
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
