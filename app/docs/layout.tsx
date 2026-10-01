import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { DocsNav } from "@/components/docs-nav";

export const metadata: Metadata = {
  title: { default: "Docs — RFP Copilot", template: "%s — RFP Copilot Docs" },
  description: "Guides for analyzing RFPs, writing proposals and managing your team in RFP Copilot.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4" /> RFP Copilot
          </Link>
          <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
            Open app →
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-8 md:self-start">
          <DocsNav />
        </aside>
        <main className="prose prose-slate min-w-0 max-w-none prose-headings:scroll-mt-20">{children}</main>
      </div>
    </div>
  );
}
