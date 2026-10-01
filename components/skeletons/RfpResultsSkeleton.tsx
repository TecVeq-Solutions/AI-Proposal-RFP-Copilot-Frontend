import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RfpResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((col) => (
        <Card key={col} className="space-y-3 p-4">
          <Skeleton className="h-5 w-1/2" />
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton key={row} className="h-4 w-full" />
          ))}
        </Card>
      ))}
    </div>
  );
}
