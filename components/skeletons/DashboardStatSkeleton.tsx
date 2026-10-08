import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardStatSkeleton() {
  return (
    <Card className="space-y-3 p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
    </Card>
  );
}
