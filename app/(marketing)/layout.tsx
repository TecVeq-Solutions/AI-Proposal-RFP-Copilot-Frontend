import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            RFP Copilot
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <Link href="/#features" className="hover:text-slate-900">Features</Link>
            <Link href="/#pricing" className="hover:text-slate-900">Pricing</Link>
            <Link href="/docs" className="hover:text-slate-900">Docs</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="min-h-11 sm:min-h-0">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="min-h-11 sm:min-h-0">
              <Link href="/register">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-600 sm:flex-row">
          <span className="flex items-center gap-2 font-semibold text-slate-900">
            <Sparkles className="h-4 w-4" /> RFP Copilot
          </span>
          <nav aria-label="Footer" className="flex gap-6">
            <Link href="/#features" className="hover:text-slate-900">Features</Link>
            <Link href="/#pricing" className="hover:text-slate-900">Pricing</Link>
            <Link href="/docs" className="hover:text-slate-900">Docs</Link>
            <Link href="/beta" className="hover:text-slate-900">Beta waitlist</Link>
          </nav>
          <span>© 2026 RFP Copilot</span>
        </div>
      </footer>
    </div>
  );
}
