'use client';
import { getToken } from './admin-auth';

export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/admin/uploads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || j?.success === false) throw new Error(j?.error?.message || 'فشل رفع الصورة');
  return j.data.url;
}
