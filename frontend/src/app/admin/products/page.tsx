'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { money } from '@/lib/format';

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', categoryId: '', goldType: 'RUSSIAN', basePrice: '', discountPrice: '', stockQuantity: '', image: '' });

  const token = () => getToken() ?? '';
  const load = () => {
    apiGet('/admin/products', { headers: { Authorization: `Bearer ${token()}` } }).then(setProducts).catch((e) => setError(e.message));
    apiGet('/categories').then(setCats).catch(() => {});
  };
  useEffect(load, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = async () => {
    setError('');
    try {
      await apiPost(
        '/admin/products',
        {
          name: form.name,
          slug: form.slug || form.name.trim().replace(/\s+/g, '-'),
          categoryId: Number(form.categoryId),
          goldType: form.goldType,
          basePrice: Number(form.basePrice),
          discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
          images: form.image ? [form.image] : [],
          variants: [{ price: Number(form.basePrice), stockQuantity: Number(form.stockQuantity || 0), minStockAlert: 5 }],
        },
        token(),
      );
      setShowForm(false);
      setForm({ name: '', slug: '', categoryId: '', goldType: 'RUSSIAN', basePrice: '', discountPrice: '', stockQuantity: '', image: '' });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">المنتجات</h1>
        <button className="btn-gold" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'إغلاق' : '+ منتج جديد'}
        </button>
      </div>

      {error && <p className="text-red-600 mb-3">{error}</p>}

      {showForm && (
        <div className="card p-4 mb-6 grid sm:grid-cols-2 gap-3">
          <input className="input" placeholder="اسم المنتج" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <input className="input" placeholder="slug (اختياري)" value={form.slug} onChange={(e) => set('slug', e.target.value)} />
          <select className="input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">اختر تصنيفاً</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className="input" value={form.goldType} onChange={(e) => set('goldType', e.target.value)}>
            <option value="RUSSIAN">ذهب روسي</option>
            <option value="CHINESE">ذهب صيني</option>
          </select>
          <input className="input" type="number" placeholder="السعر الأساسي" value={form.basePrice} onChange={(e) => set('basePrice', e.target.value)} />
          <input className="input" type="number" placeholder="سعر الخصم (اختياري)" value={form.discountPrice} onChange={(e) => set('discountPrice', e.target.value)} />
          <input className="input" type="number" placeholder="الكمية" value={form.stockQuantity} onChange={(e) => set('stockQuantity', e.target.value)} />
          <input className="input" placeholder="رابط صورة" value={form.image} onChange={(e) => set('image', e.target.value)} />
          <button className="btn-gold sm:col-span-2" onClick={create}>حفظ المنتج</button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-black/5 text-right">
            <tr>
              <th className="p-3">المنتج</th>
              <th className="p-3">التصنيف</th>
              <th className="p-3">السعر</th>
              <th className="p-3">المخزون</th>
              <th className="p-3">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const stock = p.variants?.reduce((s: number, v: any) => s + v.stockQuantity, 0) ?? 0;
              return (
                <tr key={p.id} className="border-t border-black/5">
                  <td className="p-3 font-bold">{p.name}</td>
                  <td className="p-3">{p.category?.name}</td>
                  <td className="p-3">{money(p.discountPrice ?? p.basePrice)}</td>
                  <td className="p-3">{stock}</td>
                  <td className="p-3">{p.isActive ? '✅ منشور' : '⛔ مخفي'}</td>
                </tr>
              );
            })}
            {!products.length && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-black/40">لا منتجات</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
