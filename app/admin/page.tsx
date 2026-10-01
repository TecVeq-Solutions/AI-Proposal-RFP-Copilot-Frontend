"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Eye, Loader2 } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { apiErrorMessage, tierName } from "@/lib/billing";
import { startImpersonation } from "@/lib/impersonation";
import { cn } from "@/lib/utils";
import type {
  AdminOrganization,
  AdminPaged,
  AdminStats,
  AdminUser,
  AiCosts,
  ApiResponse,
  ImpersonationResult,
  WaitlistEntry,
} from "@/types/api";

const PLANS = ["Free", "Starter", "Professional", "Enterprise"] as const;
const ALERT_KEY = "rfp_admin_cost_alert";

const usd = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: n < 10 ? 4 : 2 });
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const res = await promise;
  if (!res.data.data) throw new Error(res.data.message);
  return res.data.data;
}

function StatCard({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {value === undefined ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function useImpersonate() {
  return useMutation({
    mutationFn: async (user: { id: string; email: string }) => {
      const result = await unwrap<ImpersonationResult>(
        api.post<ApiResponse<ImpersonationResult>>(`/api/admin/users/${user.id}/impersonate`)
      );
      await startImpersonation(result.token, result.organizationId, user.email);
    },
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not impersonate this user.")),
  });
}

function OverviewTab() {
  const queryClient = useQueryClient();
  const impersonate = useImpersonate();

  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => unwrap<AdminStats>(api.get("/api/admin/stats")),
  });
  const orgs = useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: () => unwrap<AdminPaged<AdminOrganization>>(api.get("/api/admin/organizations", { params: { pageSize: 50 } })),
  });
  const signups = useQuery({
    queryKey: ["admin", "signups"],
    queryFn: () => unwrap<AdminUser[]>(api.get("/api/admin/recent-signups")),
  });

  const overridePlan = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: string }) =>
      api.patch(`/api/admin/organizations/${id}/plan`, { plan }),
    onSuccess: () => {
      toast.success("Plan updated");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not update the plan.")),
  });

  async function viewAsOrg(org: AdminOrganization) {
    // Impersonation acts as a user, so use the org's owner.
    const users = await unwrap<AdminPaged<AdminUser>>(
      api.get("/api/admin/users", { params: { search: org.ownerEmail, pageSize: 5 } })
    );
    const owner = users.items.find((u) => u.email.toLowerCase() === org.ownerEmail.toLowerCase());
    if (!owner) {
      toast.error("Could not find this organization's owner.");
      return;
    }
    impersonate.mutate({ id: owner.id, email: owner.email });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orgs" value={stats.data?.totalOrgs} />
        <StatCard label="Total Users" value={stats.data?.totalUsers} />
        <StatCard
          label="MRR"
          value={stats.data ? stats.data.mrrUsd.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : undefined}
        />
        <StatCard label="New This Week" value={stats.data?.newSignupsWeek} />
      </div>
      {stats.isError && <ErrorState message="Could not load stats." onRetry={() => void stats.refetch()} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organizations</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {orgs.isError ? (
            <ErrorState message="Could not load organizations." onRetry={() => void orgs.refetch()} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Proposals</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.isLoading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {orgs.data?.items.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="text-slate-600">{org.ownerEmail}</TableCell>
                    <TableCell>
                      <Select
                        value={tierName(org.plan)}
                        onValueChange={(plan) => overridePlan.mutate({ id: org.id, plan })}
                        disabled={overridePlan.isPending}
                      >
                        <SelectTrigger className="h-8 w-36" aria-label={`Plan for ${org.name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLANS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{org.userCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{org.proposalCount}</TableCell>
                    <TableCell className="whitespace-nowrap text-slate-600">{date(org.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={impersonate.isPending}
                        onClick={() => void viewAsOrg(org)}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" aria-hidden />
                        View as Org
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {orgs.data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500">
                      No organizations yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent signups</CardTitle>
        </CardHeader>
        <CardContent>
          {signups.isError ? (
            <ErrorState message="Could not load signups." onRetry={() => void signups.refetch()} />
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {signups.data?.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-slate-900">{u.name || u.email}</span>
                    <span className="ml-2 text-slate-500">{u.email}</span>
                  </span>
                  <span className="shrink-0 text-slate-500">{date(u.createdAt)}</span>
                </li>
              ))}
              {signups.isLoading && <Skeleton className="h-20 w-full" />}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const impersonate = useImpersonate();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setTerm(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const users = useQuery({
    queryKey: ["admin", "users", term],
    queryFn: () =>
      unwrap<AdminPaged<AdminUser>>(api.get("/api/admin/users", { params: { pageSize: 50, search: term || undefined } })),
  });

  const suspend = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      api.patch(`/api/admin/users/${id}/suspend`, { suspended }),
    onSuccess: (_res, vars) => {
      toast.success(vars.suspended ? "User suspended" : "User reactivated");
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not update the user.")),
  });

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <CardTitle className="text-base">Users</CardTitle>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          aria-label="Search users"
          className="sm:max-w-xs"
        />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {users.isError ? (
          <ErrorState message="Could not load users." onRetry={() => void users.refetch()} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.isLoading && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {users.data?.items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{u.name || u.email}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-600">{date(u.createdAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-slate-600">{date(u.lastLoginAt)}</TableCell>
                  <TableCell>
                    {u.isSuperAdmin ? (
                      <Badge className="bg-violet-100 text-violet-800">Admin</Badge>
                    ) : u.isSuspended ? (
                      <Badge className="bg-red-100 text-red-800">Suspended</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap text-right">
                    {!u.isSuperAdmin && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={impersonate.isPending || u.isSuspended}
                          onClick={() => impersonate.mutate({ id: u.id, email: u.email })}
                        >
                          Impersonate
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={u.isSuspended ? "default" : "outline"}
                          disabled={suspend.isPending}
                          onClick={() => suspend.mutate({ id: u.id, suspended: !u.isSuspended })}
                        >
                          {u.isSuspended ? "Reactivate" : "Suspend"}
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AiCostsTab() {
  const [alertOn, setAlertOn] = useState(true);
  useEffect(() => {
    try {
      setAlertOn(localStorage.getItem(ALERT_KEY) !== "0");
    } catch {
      // storage unavailable — keep the default
    }
  }, []);

  function toggleAlert(next: boolean) {
    setAlertOn(next);
    try {
      localStorage.setItem(ALERT_KEY, next ? "1" : "0");
    } catch {
      // storage unavailable — the toggle just won't persist
    }
  }

  const costs = useQuery({
    queryKey: ["admin", "ai-costs"],
    queryFn: () => unwrap<AiCosts>(api.get("/api/admin/ai-costs")),
  });

  if (costs.isError) return <ErrorState message="Could not load AI costs." onRetry={() => void costs.refetch()} />;
  if (costs.isLoading || !costs.data) return <Skeleton className="h-64 w-full" />;

  const data = costs.data;
  const maxFeature = Math.max(...data.byFeature.map((f) => f.totalCost), 0.000001);
  const maxDaily = Math.max(...data.dailyCosts.map((d) => d.costUsd), 0.000001);
  const flagged = data.byOrg.filter((o) => o.totalCost > data.alertThresholdUsd);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">AI spend this month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-4xl font-bold tabular-nums text-slate-900">{usd(data.thisMonthTotal)}</p>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={alertOn}
                onChange={(e) => toggleAlert(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Alert if org &gt; {usd(data.alertThresholdUsd)}/mo
            </label>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cost by feature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.byFeature.length === 0 && <p className="text-sm text-slate-500">No AI usage recorded this month.</p>}
            {data.byFeature.map((f) => (
              <div key={String(f.feature)} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-800">{String(f.feature)}</span>
                  <span className="tabular-nums text-slate-600">
                    {usd(f.totalCost)} · {f.callCount} call{f.callCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${Math.max(2, (f.totalCost / maxFeature) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {alertOn && flagged.length > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {flagged.map((o) => o.orgName).join(", ")} exceeded {usd(data.alertThresholdUsd)} of AI spend this month.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byOrg.map((o) => (
                  <TableRow key={o.organizationId}>
                    <TableCell className="font-medium">{o.orgName}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        alertOn && o.totalCost > data.alertThresholdUsd && "font-semibold text-red-600"
                      )}
                    >
                      {usd(o.totalCost)}
                    </TableCell>
                  </TableRow>
                ))}
                {data.byOrg.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-500">
                      No usage yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily cost (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-end gap-0.5" role="img" aria-label="Daily AI cost for the last 30 days">
              {data.dailyCosts.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${usd(d.costUsd)}`}
                  className="flex-1 rounded-t bg-violet-500"
                  style={{ height: `${d.costUsd > 0 ? Math.max(4, (d.costUsd / maxDaily) * 100) : 1}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WaitlistTab() {
  const queryClient = useQueryClient();
  const waitlist = useQuery({
    queryKey: ["admin", "waitlist"],
    queryFn: () => unwrap<WaitlistEntry[]>(api.get("/api/beta/waitlist")),
  });

  const invite = useMutation({
    mutationFn: (id: string) => api.post(`/api/beta/waitlist/${id}/invite`),
    onSuccess: () => {
      toast.success("Invite sent");
      void queryClient.invalidateQueries({ queryKey: ["admin", "waitlist"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not send the invite.")),
  });

  if (waitlist.isError) return <ErrorState message="Could not load the waitlist." onRetry={() => void waitlist.refetch()} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Beta waitlist</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Use case</TableHead>
              <TableHead>Signed up</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {waitlist.isLoading && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            )}
            {waitlist.data?.map((w) => (
              <TableRow key={w.id}>
                <TableCell>
                  <div className="font-medium text-slate-900">{w.name}</div>
                  <div className="text-xs text-slate-500">{w.email}</div>
                </TableCell>
                <TableCell>{w.company ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate text-slate-600">{w.useCase ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-slate-600">{date(w.createdAt)}</TableCell>
                <TableCell className="text-right">
                  {w.invitedAt ? (
                    <Badge className="bg-green-100 text-green-800">Invited</Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={invite.isPending}
                      onClick={() => invite.mutate(w.id)}
                    >
                      {invite.isPending && invite.variables === w.id ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : null}
                      Send invite
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {waitlist.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  Nobody on the waitlist yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
      <Tabs defaultValue="overview">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="ai-costs">AI Costs</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>
        <TabsContent value="ai-costs" className="mt-4">
          <AiCostsTab />
        </TabsContent>
        <TabsContent value="waitlist" className="mt-4">
          <WaitlistTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
