"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FilePlus2,
  FileText,
  ScanSearch,
  Search,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import type { ApiResponse, DashboardStats } from "@/lib/types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const actions = [
  {
    href: "/dashboard/proposals",
    title: "New Proposal",
    description: "Start drafting a proposal from scratch or a template.",
    icon: FilePlus2,
  },
  {
    href: "/dashboard/rfp-analyzer",
    title: "Analyze RFP",
    description: "Extract requirements and build a compliance matrix.",
    icon: ScanSearch,
  },
  {
    href: "/dashboard/documents",
    title: "Upload Document",
    description: "Add source docs to your knowledge library.",
    icon: Upload,
  },
  {
    href: "/dashboard/settings",
    title: "Invite Team",
    description: "Bring colleagues into your workspace.",
    icon: UserPlus,
  },
];

export default function DashboardPage() {
  const { user, currentOrg, loading } = useAuth();
  const firstName = user?.firstName || "there";
  const orgId = currentOrg?.id;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!orgId) return;
    setStatsError(false);
    try {
      const res = await api.get<ApiResponse<DashboardStats>>(`/api/organizations/${orgId}/dashboard/stats`);
      if (res.data.success && res.data.data) setStats(res.data.data);
    } catch {
      // Quick actions and greeting still render; recent-activity panels show an error state.
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!loading && orgId) void fetchStats();
  }, [loading, orgId, fetchStats]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">
          {loading ? "Welcome back" : `Good ${greetingForNow()}, ${firstName}!`}
        </h2>
        <p className="mt-2 text-slate-600">
          Your AI-assisted workspace for analyzing RFPs and drafting proposals.
        </p>
      </div>

      {orgId ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
              <FileText className="h-4 w-4" /> Total Proposals
            </div>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.proposalsCount.total ?? 0}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
              <TrendingUp className="h-4 w-4" /> This Month
            </div>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.proposalsCount.thisMonth ?? 0}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-purple-700">
              <Search className="h-4 w-4" /> RFPs Analyzed
            </div>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.rfpAnalysesCount.total ?? 0}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-orange-700">
              <Users className="h-4 w-4" /> Team Members
            </div>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.teamMembersCount ?? 0}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map(({ href, title, description, icon: Icon }) => (
          <Link key={href + title} href={href} className="group">
            <Card className="h-full transition-colors group-hover:border-slate-400 group-hover:bg-white">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-slate-900 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {orgId && !statsLoading && statsError ? (
        <ErrorState message="Could not load recent activity." onRetry={() => void fetchStats()} />
      ) : null}

      {orgId && !statsLoading && stats ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-4">
            <h3 className="mb-3 font-medium text-slate-900">Recent Proposals</h3>
            {stats.recentProposals.length === 0 ? (
              <p className="text-sm text-slate-500">No proposals yet.</p>
            ) : (
              <ul className="space-y-2">
                {stats.recentProposals.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/proposals/${p.id}/edit`}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
                    >
                      <span className="truncate text-sm text-slate-800">{p.title}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className="text-xs">{p.status}</Badge>
                        <span className="text-xs text-slate-400">{formatRelative(p.updatedAt)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4">
            <h3 className="mb-3 font-medium text-slate-900">Recent RFP Analyses</h3>
            {stats.recentAnalyses.length === 0 ? (
              <p className="text-sm text-slate-500">No analyses yet.</p>
            ) : (
              <ul className="space-y-2">
                {stats.recentAnalyses.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/dashboard/rfp-analyzer/${a.id}`}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
                    >
                      <span className="truncate text-sm text-slate-800">{a.title}</span>
                      <span className="shrink-0 text-xs text-slate-400">{a.compliancePercent}% compliant</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
