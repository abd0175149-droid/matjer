import { ProductGridSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="container-x my-6">
      <Skeleton className="h-8 w-40 mb-2" />
      <Skeleton className="h-4 w-24 mb-6" />
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-20" />)}
      </div>
      <ProductGridSkeleton count={12} />
    </div>
  );
}
