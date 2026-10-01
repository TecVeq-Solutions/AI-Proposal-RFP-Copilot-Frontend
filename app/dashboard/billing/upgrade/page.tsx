"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { ErrorState } from "@/components/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { apiErrorMessage, isAdminOrOwner, tierName } from "@/lib/billing";
import { cn } from "@/lib/utils";
import type { ApiResponse, SubscriptionPlanInfo } from "@/types/api";

export default function UpgradePage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id;
  const canManage = isAdminOrOwner(currentOrg?.currentUserRole);
  const currentTier = tierName(currentOrg?.plan);

  const plansQuery = useQuery({
    queryKey: ["billing", orgId, "plans"],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const res = await api.get<ApiResponse<SubscriptionPlanInfo[]>>(`/api/organizations/${orgId}/billing/plans`);
      return (res.data.data ?? []).filter((p) => p.purchasable);
    },
  });

  const checkout = useMutation({
    mutationFn: async (planId: string) => {
      const res = await api.post<ApiResponse<{ checkoutUrl: string }>>(
        `/api/organizations/${orgId}/billing/checkout`,
        { planId }
      );
      return res.data.data?.checkoutUrl;
    },
    onSuccess: (url) => {
      if (url) window.location.href = url;
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not start checkout.")),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Choose a plan</h1>
        <p className="text-sm text-slate-600">
          You are on the <strong>{currentTier}</strong> plan.{" "}
          <Link href="/dashboard/billing" className="text-blue-700 hover:underline">
            Back to billing
          </Link>
        </p>
      </div>

      {!canManage && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Only organization owners and admins can change the plan.
        </p>
      )}

      {plansQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : plansQuery.isError ? (
        <ErrorState message="Could not load plans." onRetry={() => void plansQuery.refetch()} />
      ) : (plansQuery.data ?? []).length === 0 ? (
        <p className="text-sm text-slate-600">
          No paid plans are configured yet. Set the Stripe price IDs in the backend settings.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {plansQuery.data!.map((plan) => {
            const isCurrent = tierName(plan.tier) === currentTier;
            const popular = tierName(plan.tier) === "Professional";
            return (
              <div
                key={plan.id}
                className={cn(
                  "flex flex-col gap-4 rounded-lg border bg-white p-6",
                  popular ? "border-blue-600 ring-1 ring-blue-600" : "border-slate-200"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
                  {popular && <Badge>Most popular</Badge>}
                </div>
                <p>
                  <span className="text-3xl font-semibold text-slate-900">${plan.priceMonthly}</span>
                  <span className="text-sm text-slate-600"> / month</span>
                </p>
                <ul className="flex-1 space-y-2 text-sm text-slate-700">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  className="min-h-[44px]"
                  disabled={isCurrent || !canManage || checkout.isPending}
                  onClick={() => checkout.mutate(plan.id)}
                >
                  {isCurrent ? "Current plan" : checkout.isPending ? "Redirecting…" : "Choose Plan"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
