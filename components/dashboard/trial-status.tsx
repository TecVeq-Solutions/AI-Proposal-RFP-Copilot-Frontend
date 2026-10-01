"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock, Lock } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ApiResponse, Subscription } from "@/types/api";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TrialState =
  | { kind: "none" }
  | { kind: "trialing"; daysLeft: number }
  | { kind: "expired" };

/**
 * Derives the trial state from the billing subscription (Day 62).
 * A trial whose end date has passed but that the daily CheckExpiredTrialsJob has not downgraded yet
 * is already treated as expired. An org that never trialed, or that upgraded, has `trialEndsAt` null
 * or an Active status and is "none".
 */
export function getTrialState(sub: Subscription | undefined, now = Date.now()): TrialState {
  if (!sub?.trialEndsAt) return { kind: "none" };
  const endsAt = new Date(sub.trialEndsAt).getTime();
  const status = String(sub.status);

  if (status === "Trialing") {
    return endsAt > now
      ? { kind: "trialing", daysLeft: Math.max(1, Math.ceil((endsAt - now) / MS_PER_DAY)) }
      : { kind: "expired" };
  }
  if (status === "None" && endsAt <= now) return { kind: "expired" };
  return { kind: "none" };
}

function useTrialState(): TrialState {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id;

  // Same key as the billing page so both share one cached request.
  const { data } = useQuery({
    queryKey: ["billing", orgId, "subscription"],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Subscription>>(
        `/api/organizations/${orgId}/billing/subscription`,
        { skipErrorToast: true }
      );
      if (!res.data.data) throw new Error(res.data.message);
      return res.data.data;
    },
  });

  return getTrialState(data);
}

export function TrialBanner() {
  const state = useTrialState();
  if (state.kind !== "trialing") return null;

  const { daysLeft } = state;
  const tone =
    daysLeft > 7
      ? "border-green-200 bg-green-50 text-green-900"
      : daysLeft >= 4
        ? "border-yellow-200 bg-yellow-50 text-yellow-900"
        : "border-red-200 bg-red-50 text-red-900";
  const message =
    daysLeft > 7
      ? `Trial: ${daysLeft} days remaining`
      : daysLeft >= 4
        ? `Trial: ${daysLeft} days remaining — Upgrade`
        : daysLeft <= 1
          ? "Trial ends tomorrow!"
          : `Trial ends in ${daysLeft} days!`;

  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm font-medium sm:px-6",
        tone,
        daysLeft < 4 && "animate-pulse"
      )}
    >
      <span className="flex items-center gap-2">
        <Clock className="h-4 w-4" aria-hidden />
        {message}
      </span>
      <Button asChild size="sm" variant={daysLeft < 4 ? "default" : "outline"} className="h-8">
        <Link href="/dashboard/billing/upgrade">Upgrade</Link>
      </Button>
    </div>
  );
}

/** Non-dismissible: once the trial is over the only way forward is to pick a plan. */
export function TrialExpiredModal() {
  const state = useTrialState();
  const pathname = usePathname();

  // Never block the pages that let the user fix the problem.
  const onBillingPage = pathname.startsWith("/dashboard/billing");
  if (state.kind !== "expired" || onBillingPage) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="trial-expired-title"
      aria-describedby="trial-expired-description"
    >
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-white p-6 text-center shadow-lg">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <Lock className="h-6 w-6 text-red-600" aria-hidden />
        </div>
        <h2 id="trial-expired-title" className="text-lg font-semibold text-slate-900">
          Your free trial has ended
        </h2>
        <p id="trial-expired-description" className="text-sm text-slate-600">
          Your free trial has ended. Upgrade to continue. Your data is safe and will be there when you pick a plan.
        </p>
        <Button asChild className="w-full">
          <Link href="/dashboard/billing/upgrade">View Plans</Link>
        </Button>
      </div>
    </div>
  );
}
