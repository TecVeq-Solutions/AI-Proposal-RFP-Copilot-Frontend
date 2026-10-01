"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CreditCard, Download } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useConfirm } from "@/components/confirm-provider";
import { ErrorState } from "@/components/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import {
  TIER_BADGE_CLASS,
  apiErrorMessage,
  formatLimit,
  isAdminOrOwner,
  tierName,
} from "@/lib/billing";
import { cn } from "@/lib/utils";
import type { ApiResponse, Invoice, Subscription, UsageMeter } from "@/types/api";

function formatDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
}

function UsageBar({ label, meter, noun }: { label: string; meter: UsageMeter; noun: string }) {
  const unlimited = meter.limit < 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((meter.used / Math.max(meter.limit, 1)) * 100));
  const atLimit = !unlimited && meter.used >= meter.limit;
  const warn = !unlimited && pct > 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-slate-900">{label}</span>
        <span className={cn("tabular-nums", warn ? "font-medium text-red-600" : "text-slate-600")}>
          {meter.used} / {formatLimit(meter.limit)} {noun}
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={meter.used}
        aria-valuemin={0}
        aria-valuemax={unlimited ? undefined : meter.limit}
        aria-label={label}
      >
        <div
          className={cn("h-full rounded-full transition-all", warn ? "bg-red-500" : "bg-blue-600")}
          style={{ width: unlimited ? "8%" : `${pct}%` }}
        />
      </div>
      {atLimit && (
        <Link href="/dashboard/billing/upgrade" className="text-xs font-medium text-blue-700 hover:underline">
          Limit reached — upgrade for more
        </Link>
      )}
    </div>
  );
}

const INVOICE_BADGE: Record<Invoice["status"], string> = {
  Paid: "bg-green-100 text-green-800",
  Failed: "bg-red-100 text-red-800",
  Upcoming: "bg-slate-100 text-slate-700",
  Void: "bg-slate-100 text-slate-500",
};

export default function BillingPage() {
  const { currentOrg, refresh } = useAuth();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const orgId = currentOrg?.id;
  const canManage = isAdminOrOwner(currentOrg?.currentUserRole);

  const subscriptionQuery = useQuery({
    queryKey: ["billing", orgId, "subscription"],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Subscription>>(`/api/organizations/${orgId}/billing/subscription`);
      if (!res.data.data) throw new Error(res.data.message);
      return res.data.data;
    },
  });

  const invoicesQuery = useQuery({
    queryKey: ["billing", orgId, "invoices"],
    // The invoices endpoint is admin-only; members would just get a 403 toast.
    enabled: Boolean(orgId) && canManage,
    queryFn: async () => {
      const res = await api.get<ApiResponse<Invoice[]>>(`/api/organizations/${orgId}/billing/invoices`);
      return res.data.data ?? [];
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/api/organizations/${orgId}/billing/cancel`),
    onSuccess: async () => {
      toast.success("Subscription will cancel at the end of the billing period.");
      await queryClient.invalidateQueries({ queryKey: ["billing", orgId] });
      await refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not cancel the subscription.")),
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get<ApiResponse<{ url: string }>>(`/api/organizations/${orgId}/billing/portal`);
      return res.data.data?.url;
    },
    onSuccess: (url) => {
      if (url) window.location.href = url;
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not open the billing portal.")),
  });

  if (subscriptionQuery.isLoading || !orgId) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (subscriptionQuery.isError || !subscriptionQuery.data) {
    return (
      <ErrorState
        message="Could not load billing information."
        onRetry={() => void subscriptionQuery.refetch()}
      />
    );
  }

  const sub = subscriptionQuery.data;
  const tier = tierName(sub.plan.tier);
  const isPaid = tier !== "Free";
  const trialActive = sub.trialEndsAt !== null && new Date(sub.trialEndsAt) > new Date();
  const hasLiveSubscription = isPaid && sub.status !== "None" && sub.status !== "Canceled";

  async function handleCancel() {
    const ok = await confirm({
      title: "Cancel subscription?",
      description: `Access continues until ${formatDate(sub.currentPeriodEndsAt)}. Are you sure?`,
      confirmLabel: "Cancel subscription",
      cancelLabel: "Keep plan",
    });
    if (ok) cancelMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-600">Your plan, usage and invoices.</p>
      </div>

      {sub.status === "PastDue" && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Your last payment failed.</p>
            <p>Update your payment method to keep your plan.</p>
          </div>
        </div>
      )}

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-medium text-slate-900">Current plan</h2>
          <Badge className={cn("border-transparent", TIER_BADGE_CLASS[tier])}>{sub.plan.name}</Badge>
          {sub.cancelAtPeriodEnd && <Badge variant="outline">Cancels {formatDate(sub.currentPeriodEndsAt)}</Badge>}
        </div>

        <p className="text-sm text-slate-600">
          <span className="text-2xl font-semibold text-slate-900">${sub.plan.priceMonthly}</span>
          <span> / month</span>
          {hasLiveSubscription && !sub.cancelAtPeriodEnd && sub.currentPeriodEndsAt && (
            <span className="block sm:ml-3 sm:inline">Next billing: {formatDate(sub.currentPeriodEndsAt)}</span>
          )}
          {trialActive && (
            <span className="block sm:ml-3 sm:inline">Trial ends: {formatDate(sub.trialEndsAt)}</span>
          )}
        </p>

        <ul className="grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
          {sub.plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden />
              {f}
            </li>
          ))}
        </ul>

        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button asChild className="min-h-[44px] sm:min-h-0">
              <Link href="/dashboard/billing/upgrade">{isPaid ? "Change plan" : "Upgrade"}</Link>
            </Button>
            {hasLiveSubscription && !sub.cancelAtPeriodEnd && (
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] sm:min-h-0"
                disabled={cancelMutation.isPending}
                onClick={() => void handleCancel()}
              >
                Cancel subscription
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-medium text-slate-900">Usage this month</h2>
        <UsageBar label="Proposals" meter={sub.usage.proposals} noun="used" />
        <UsageBar label="RFP analyses" meter={sub.usage.rfpAnalyses} noun="used" />
        <UsageBar label="Team members" meter={sub.usage.teamMembers} noun="seats" />
      </section>

      {canManage && (
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-medium text-slate-900">Payment method</h2>
          {sub.paymentMethod ? (
            <p className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <CreditCard className="h-4 w-4" />
              <span className="capitalize">{sub.paymentMethod.brand}</span> ending in {sub.paymentMethod.last4}
              <span className="text-slate-500">
                · Expires {String(sub.paymentMethod.expMonth).padStart(2, "0")}/
                {String(sub.paymentMethod.expYear).slice(-2)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-slate-600">No payment method on file.</p>
          )}
          {sub.hasStripeCustomer && (
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] sm:min-h-0"
              disabled={portalMutation.isPending}
              onClick={() => portalMutation.mutate()}
            >
              Update payment method
            </Button>
          )}
        </section>
      )}

      {canManage && (
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-medium text-slate-900">Invoice history</h2>
          {invoicesQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : invoicesQuery.isError ? (
            <p className="text-sm text-red-600">Could not load invoices.</p>
          ) : (invoicesQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-600">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesQuery.data!.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(inv.date)}</TableCell>
                      <TableCell>{inv.description}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {inv.amount.toLocaleString(undefined, {
                          style: "currency",
                          currency: inv.currency.toUpperCase(),
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border-transparent", INVOICE_BADGE[inv.status])}>{inv.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {inv.pdfUrl ? (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Download invoice ${inv.id}`}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
