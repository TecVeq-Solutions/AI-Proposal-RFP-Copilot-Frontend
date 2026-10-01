"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Activity as ActivityIcon } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  ActivityAction,
  ActivityEntityType,
  ActivityListResponse,
  ActivityLogItem,
  ApiResponse,
} from "@/types/api";

type TypeFilter = "All" | ActivityEntityType;
type DateFilter = "Today" | "Week" | "All";

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Proposal", label: "Proposals" },
  { value: "RfpAnalysis", label: "RFPs" },
  { value: "Document", label: "Documents" },
  { value: "Team", label: "Team" },
];

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: "Today", label: "Today" },
  { value: "Week", label: "This Week" },
  { value: "All", label: "All Time" },
];

const ACTION_VERB: Record<ActivityAction, string> = {
  Created: "created",
  Updated: "updated",
  Deleted: "deleted",
  Shared: "shared",
  Exported: "exported",
  Commented: "commented on",
  StatusChanged: "changed the status of",
  Analyzed: "finished analyzing",
  Uploaded: "uploaded",
  PlanChanged: "changed the plan for",
};

function sinceFor(filter: DateFilter): string | undefined {
  if (filter === "All") return undefined;
  const d = new Date();
  if (filter === "Today") {
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(d.getDate() - 7);
  }
  return d.toISOString();
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Where clicking an entry goes. Deleted entities no longer exist, so they are not linkable. */
function entityHref(item: ActivityLogItem): string | null {
  if (item.action === "Deleted") return null;
  switch (item.entityType) {
    case "Proposal":
      return `/dashboard/proposals/${item.entityId}`;
    case "RfpAnalysis":
      return `/dashboard/rfp-analyzer/${item.entityId}`;
    case "Document":
      return `/dashboard/documents/${item.entityId}`;
    case "Team":
      return "/dashboard/settings";
  }
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((o) => (
        <Button
          key={o.value}
          type="button"
          size="sm"
          variant={o.value === value ? "default" : "outline"}
          className="min-h-[44px] sm:min-h-0"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

export default function ActivityPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id;

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [dateFilter, setDateFilter] = useState<DateFilter>("All");

  // Recomputed only when the filter changes so the query key stays stable between renders.
  const since = useMemo(() => sinceFor(dateFilter), [dateFilter]);

  const query = useInfiniteQuery({
    queryKey: ["activity", orgId, typeFilter, dateFilter],
    enabled: Boolean(orgId),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam) });
      if (typeFilter !== "All") params.set("entityType", typeFilter);
      if (since) params.set("since", since);
      const res = await api.get<ApiResponse<ActivityListResponse>>(
        `/api/organizations/${orgId}/activity?${params.toString()}`
      );
      if (!res.data.data) throw new Error(res.data.message);
      return res.data.data;
    },
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });

  // Infinite scroll: load the next page when the sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Activity</h1>
        <p className="text-sm text-slate-600">What has happened in {currentOrg?.name ?? "your workspace"}.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterGroup label="Filter by type" options={TYPE_FILTERS} value={typeFilter} onChange={setTypeFilter} />
        <FilterGroup label="Filter by date" options={DATE_FILTERS} value={dateFilter} onChange={setDateFilter} />
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message="Could not load activity." onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No activity yet"
          description="Actions like creating proposals, uploading documents and running analyses will show up here."
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {items.map((item) => {
            const href = entityHref(item);
            const name = item.userName || "Someone";
            const title = href ? (
              <Link href={href} className="font-medium text-slate-900 hover:underline">
                “{item.entityTitle}”
              </Link>
            ) : (
              <span className={cn("font-medium text-slate-900", item.action === "Deleted" && "line-through")}>
                “{item.entityTitle}”
              </span>
            );

            return (
              <li key={item.id} className="flex items-start gap-3 p-4">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-slate-200 text-xs font-medium text-slate-700">
                    {initials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm text-slate-700">
                    <span className="font-medium text-slate-900">{name}</span> {ACTION_VERB[item.action] ?? "updated"}{" "}
                    {title}
                  </p>
                  <p className="text-xs text-slate-500" title={new Date(item.createdAt).toLocaleString()}>
                    {timeAgo(item.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div ref={sentinelRef} aria-hidden className="h-1" />
      {isFetchingNextPage && <Skeleton className="h-14 w-full" />}
      {!query.isLoading && items.length > 0 && !hasNextPage && (
        <p className="text-center text-xs text-slate-500">You have reached the end.</p>
      )}
    </div>
  );
}
