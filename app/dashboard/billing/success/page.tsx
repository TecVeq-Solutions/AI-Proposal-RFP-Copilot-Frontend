"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PartyPopper } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { tierName } from "@/lib/billing";
import type { ApiResponse, Subscription } from "@/types/api";

const MAX_POLLS = 10;

function SuccessContent() {
  const { currentOrg, refresh } = useAuth();
  const orgId = currentOrg?.id;

  // The plan is applied by the Stripe webhook, which can land a moment after the redirect —
  // poll briefly until the org is no longer on Free.
  const polls = useRef(0);
  const { data } = useQuery({
    queryKey: ["billing", orgId, "subscription", "success"],
    enabled: Boolean(orgId),
    queryFn: async () => {
      polls.current += 1;
      const res = await api.get<ApiResponse<Subscription>>(`/api/organizations/${orgId}/billing/subscription`);
      return res.data.data;
    },
    refetchInterval: (query) => {
      const tier = tierName(query.state.data?.plan.tier);
      return tier === "Free" && polls.current < MAX_POLLS ? 2000 : false;
    },
  });

  const upgraded = Boolean(data) && tierName(data!.plan.tier) !== "Free";

  useEffect(() => {
    if (upgraded) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upgraded]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="rounded-full bg-green-100 p-4">
        <PartyPopper className="h-8 w-8 text-green-700" />
      </div>
      {upgraded ? (
        <>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome to {data!.plan.name}! 🎉</h1>
          <p className="text-sm text-slate-600">Your new limits are active. A confirmation email is on its way.</p>
        </>
      ) : polls.current >= MAX_POLLS ? (
        <>
          <h1 className="text-2xl font-semibold text-slate-900">Payment received</h1>
          <p className="text-sm text-slate-600">
            Your plan is still being activated. This can take a minute — check the billing page shortly.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-slate-900">Finishing up…</h1>
          <p className="text-sm text-slate-600">Confirming your payment with Stripe.</p>
        </>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild className="min-h-[44px]">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link href="/dashboard/billing">View billing</Link>
        </Button>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
