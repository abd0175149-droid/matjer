import { ProductGridSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="container-x my-6">
      <Skeleton className="h-8 w-40 mb-2" />
      <Skeleton className="h-4 w-32 mb-6" />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
