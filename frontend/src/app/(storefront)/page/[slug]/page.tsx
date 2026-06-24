import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function StaticPage({ params }: { params: { slug: string } }) {
  let page: any;
  try { page = await apiGet(`/pages/${params.slug}`); } catch { notFound(); }

  return (
    <div className="max-w-3xl mx-auto px-4 my-8">
      <h1 className="text-2xl font-extrabold mb-4">{page.title}</h1>
      <div className="prose max-w-none text-black/80 whitespace-pre-wrap leading-relaxed">{page.content}</div>
    </div>
  );
}
