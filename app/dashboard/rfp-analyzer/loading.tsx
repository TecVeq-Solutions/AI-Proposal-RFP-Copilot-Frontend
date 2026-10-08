import { DocumentRowSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function RfpAnalyzerLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full" />
      <div className="rounded-lg border border-slate-200 bg-white">
        {[0, 1, 2, 3, 4].map((i) => (
          <DocumentRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
