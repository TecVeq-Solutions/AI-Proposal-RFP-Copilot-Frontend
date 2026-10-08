"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const DOCS_LINKS = [
  { href: "/docs/getting-started", label: "Getting Started" },
  { href: "/docs/rfp-analyzer", label: "RFP Analyzer" },
  { href: "/docs/proposals", label: "Writing Proposals" },
  { href: "/docs/team", label: "Team Management" },
  { href: "/docs/faq", label: "FAQ" },
];

export function DocsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Documentation" className="flex gap-1 overflow-x-auto md:flex-col">
      {DOCS_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={cn(
            "whitespace-nowrap rounded-md px-3 py-2 text-sm",
            pathname === href
              ? "bg-slate-900 font-medium text-white"
              : "text-slate-700 hover:bg-slate-100"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
