import { Skeleton } from "@/components/ui/skeleton";

export function DocumentRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-0">
      <Skeleton className="h-8 w-8 rounded" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="hidden h-4 w-20 sm:block" />
      <Skeleton className="hidden h-4 w-24 sm:block" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}
