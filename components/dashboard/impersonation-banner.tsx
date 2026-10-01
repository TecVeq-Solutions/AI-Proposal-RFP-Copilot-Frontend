"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImpersonationLabel, stopImpersonation } from "@/lib/impersonation";

/** Shown while a super admin is "viewing as" another user (Day 61). */
export function ImpersonationBanner() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(getImpersonationLabel());
  }, []);

  if (!label) return null;

  async function exit() {
    if (await stopImpersonation()) {
      window.location.href = "/admin";
    }
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-900 sm:px-6"
    >
      <span className="flex items-center gap-2">
        <Eye className="h-4 w-4" aria-hidden />
        Viewing as {label}
      </span>
      <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => void exit()}>
        Exit
      </Button>
    </div>
  );
}
