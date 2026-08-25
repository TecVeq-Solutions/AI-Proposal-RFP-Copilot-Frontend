"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/proposals": "Proposals",
  "/dashboard/rfp-analyzer": "RFP Analyzer",
  "/dashboard/documents": "Documents",
  "/dashboard/templates": "Templates",
  "/dashboard/settings": "Settings",
};

export function Header() {
  const pathname = usePathname();
  const title = titles[pathname] ?? "RFP Copilot";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-700"
        aria-label="User avatar placeholder"
      >
        U
      </div>
    </header>
  );
}
