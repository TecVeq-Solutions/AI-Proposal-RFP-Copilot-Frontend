import { DashboardStatSkeleton, DocumentRowSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <DashboardStatSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white">
            {[0, 1, 2].map((r) => (
              <DocumentRowSkeleton key={r} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
