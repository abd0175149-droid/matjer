'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiSend } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { uploadImage } from '@/lib/upload';
import { money } from '@/lib/format';

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = () => getToken() ?? '';
  const [p, setP] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [variant, setVariant] = useState({ sku: '', color: '', size: '', price: '', stockQuantity: '' });

  const load = () => apiGet(`/admin/products/${id}`, { headers: { Authorization: `Bearer ${token()}` } }).then(setP).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, [id]);

  if (!p) return <p className="text-black/40">{msg || 'جارٍ التحميل…'}</p>;

  const saveFields = async () => {
    setMsg('');
    try {
      await apiSend('PATCH', `/admin/products/${id}`, {
        name: p.name, description: p.description, basePrice: Number(p.basePrice),
        discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
        isFeatured: p.isFeatured, isActive: p.isActive,
      }, token());
      setMsg('تم الحفظ ✓');
    } catch (e: any) { setMsg(e.message); }
  };

  const del = async () => {
    if (!confirm('حذف المنتج؟')) return;
    await apiSend('DELETE', `/admin/products/${id}`, undefined, token());
    router.push('/admin/products');
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      await apiSend('POST', `/admin/products/${id}/images`, { urls: [url] }, token());
      load();
    } catch (err: any) { setMsg(err.message); }
  };

  const delImage = async (imageId: number) => { await apiSend('DELETE', `/admin/images/${imageId}`, undefined, token()); load(); };

  const addVariant = async () => {
    if (!variant.price) return;
    await apiSend('POST', `/admin/products/${id}/variants`, {
      sku: variant.sku || `${p.slug}-${Date.now()}`, color: variant.color, size: variant.size,
      price: Number(variant.price), stockQuantity: Number(variant.stockQuantity || 0), minStockAlert: 5,
    }, token());
    setVariant({ sku: '', color: '', size: '', price: '', stockQuantity: '' });
    load();
  };
  const delVariant = async (vid: number) => { await apiSend('DELETE', `/admin/variants/${vid}`, undefined, token()); load(); };

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-extrabold">تعديل: {p.name}</h1>
        <button onClick={del} className="text-red-600 text-sm">حذف المنتج</button>
      </div>
      {msg && <p className="text-gold-dark mb-3">{msg}</p>}

      <div className="card p-4 mb-6 grid sm:grid-cols-2 gap-3">
        <input className="input sm:col-span-2" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="الاسم" />
        <textarea className="input sm:col-span-2" value={p.description ?? ''} onChange={(e) => setP({ ...p, description: e.target.value })} placeholder="الوصف" />
        <input className="input" type="number" value={p.basePrice} onChange={(e) => setP({ ...p, basePrice: e.target.value })} placeholder="السعر الأساسي" />
        <input className="input" type="number" value={p.discountPrice ?? ''} onChange={(e) => setP({ ...p, discountPrice: e.target.value })} placeholder="سعر الخصم" />
        <label className="flex items-center gap-2"><input type="checkbox" checked={p.isFeatured} onChange={(e) => setP({ ...p, isFeatured: e.target.checked })} /> مميّز</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={p.isActive} onChange={(e) => setP({ ...p, isActive: e.target.checked })} /> منشور</label>
        <button className="btn-gold sm:col-span-2" onClick={saveFields}>حفظ التعديلات</button>
      </div>

      <div className="card p-4 mb-6">
        <h2 className="font-bold mb-3">الصور</h2>
        <div className="flex flex-wrap gap-3 mb-3">
          {p.images?.map((img: any) => (
            <div key={img.id} className="relative w-24 h-24 rounded overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => delImage(img.id)} className="absolute top-0 left-0 bg-red-600 text-white text-xs px-1">×</button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/*" onChange={onUpload} />
      </div>

      <div className="card p-4">
        <h2 className="font-bold mb-3">المتغيّرات</h2>
        <table className="w-full text-sm mb-4">
          <thead className="bg-black/5 text-right"><tr><th className="p-2">SKU</th><th className="p-2">اللون/المقاس</th><th className="p-2">السعر</th><th className="p-2">المخزون</th><th></th></tr></thead>
          <tbody>
            {p.variants?.filter((v: any) => v.isActive).map((v: any) => (
              <tr key={v.id} className="border-t border-black/5">
                <td className="p-2">{v.sku}</td>
                <td className="p-2">{[v.color, v.size].filter(Boolean).join(' / ')}</td>
                <td className="p-2">{money(v.price)}</td>
                <td className="p-2">{v.stockQuantity}</td>
                <td className="p-2"><button onClick={() => delVariant(v.id)} className="text-red-600 text-xs">حذف</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid sm:grid-cols-5 gap-2">
          <input className="input" placeholder="SKU" value={variant.sku} onChange={(e) => setVariant({ ...variant, sku: e.target.value })} />
          <input className="input" placeholder="لون" value={variant.color} onChange={(e) => setVariant({ ...variant, color: e.target.value })} />
          <input className="input" placeholder="مقاس" value={variant.size} onChange={(e) => setVariant({ ...variant, size: e.target.value })} />
          <input className="input" type="number" placeholder="سعر" value={variant.price} onChange={(e) => setVariant({ ...variant, price: e.target.value })} />
          <input className="input" type="number" placeholder="كمية" value={variant.stockQuantity} onChange={(e) => setVariant({ ...variant, stockQuantity: e.target.value })} />
        </div>
        <button className="btn-outline mt-3" onClick={addVariant}>+ إضافة متغيّر</button>
      </div>
    </div>
  );
}
