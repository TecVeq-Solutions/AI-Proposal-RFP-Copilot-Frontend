"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { requestNewProposal } from "@/lib/new-proposal-event";

/** Dashboard-wide shortcuts: Ctrl/Cmd+K opens the command palette, Ctrl/Cmd+N (proposals page) opens "New Proposal". */
export function DashboardShortcuts() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useKeyboardShortcuts([
    { key: "k", mod: true, handler: () => setOpen((o) => !o) },
    {
      key: "n",
      mod: true,
      handler: () => {
        if (pathname === "/dashboard/proposals") requestNewProposal(pathname, router);
      },
    },
  ]);

  return <CommandPalette open={open} onOpenChange={setOpen} />;
}
