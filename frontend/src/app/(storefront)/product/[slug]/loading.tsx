import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="container-x my-6">
      <div className="grid md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-11 w-48" />
        </div>
      </div>
    </div>
  );
}
