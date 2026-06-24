import type { MetadataRoute } from 'next';
import { apiGet } from '@/lib/api';

export const dynamic = 'force-dynamic';

const SITE = process.env.SITE_URL || 'https://sooq.grade.sbs';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    { url: SITE, priority: 1 },
    ...['sets', 'rings', 'bracelets', 'necklaces'].map((c) => ({ url: `${SITE}/category/${c}`, priority: 0.8 })),
  ];
  try {
    const data = await apiGet('/products?limit=100');
    for (const p of data.items || []) urls.push({ url: `${SITE}/product/${p.slug}`, priority: 0.6 });
  } catch { /* */ }
  return urls;
}
