"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const PLAN_LIMIT_EVENT = "rfp:plan-limit";

export interface PlanLimitDetail {
  message: string;
  upgradeUrl?: string;
}

/** Global 402 handler — the Axios interceptor dispatches PLAN_LIMIT_EVENT instead of showing a toast. */
export function UpgradePromptModal() {
  const [detail, setDetail] = useState<PlanLimitDetail | null>(null);

  useEffect(() => {
    const onLimit = (e: Event) => setDetail((e as CustomEvent<PlanLimitDetail>).detail);
    window.addEventListener(PLAN_LIMIT_EVENT, onLimit);
    return () => window.removeEventListener(PLAN_LIMIT_EVENT, onLimit);
  }, []);

  return (
    <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan limit reached</DialogTitle>
          <DialogDescription>{detail?.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDetail(null)}>
            Dismiss
          </Button>
          <Button asChild>
            <Link href={detail?.upgradeUrl ?? "/dashboard/billing/upgrade"} onClick={() => setDetail(null)}>
              Upgrade Now
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
