import type { Metadata } from "next";
import Link from "next/link";
import { Check, ClipboardCheck, PenLine, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "RFP Copilot — Win More RFPs with AI-Powered Proposals",
  description:
    "Upload any RFP, AI extracts requirements and builds your compliance matrix. Generate winning proposals in minutes.",
};

const FEATURES = [
  {
    icon: ScanSearch,
    title: "Smart RFP Analysis",
    body: "AI extracts every requirement, deadline, and evaluation criterion automatically.",
  },
  {
    icon: PenLine,
    title: "AI Proposal Writer",
    body: "Generate professional proposals from your RFP analysis. Edit with AI slash commands.",
  },
  {
    icon: ClipboardCheck,
    title: "Compliance Matrix",
    body: "Never miss a requirement. Track compliance and export to Excel.",
  },
];

const STEPS = ["Upload RFP", "AI Analyzes", "Generate & Edit", "Export & Submit"];

const PLANS = [
  {
    name: "Starter",
    price: 49,
    features: ["5 RFP analyses / month", "AI proposal generation", "PDF & Word export", "1 team member"],
  },
  {
    name: "Professional",
    price: 149,
    highlight: true,
    features: ["50 RFP analyses / month", "Compliance matrix export", "Team collaboration & comments", "Up to 10 team members"],
  },
  {
    name: "Enterprise",
    price: 499,
    features: ["Unlimited analyses", "Unlimited team members", "Priority support", "Custom onboarding"],
  },
];

const MOCK_REQUIREMENTS = [
  { id: "R-01", text: "Vendor must provide 24/7 support with a 1-hour SLA", status: "Compliant", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { id: "R-02", text: "Solution must be SOC 2 Type II certified", status: "Partial", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  { id: "R-03", text: "Data hosted within the EU region", status: "Compliant", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { id: "R-04", text: "Submit pricing in the provided template", status: "Pending", tone: "bg-slate-50 text-slate-700 border-slate-200" },
];

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge variant="outline" className="mb-4">🎉 Now in Private Beta</Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Win More RFPs with AI-Powered Proposals
            </h1>
            <p className="mt-4 max-w-xl text-lg text-slate-600">
              Upload any RFP, AI extracts requirements and builds your compliance matrix. Generate winning proposals in minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="min-h-11">
                <Link href="/register">Start Free 14-Day Trial</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-11">
                <Link href="/docs/getting-started">Watch Demo</Link>
              </Button>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">City Infrastructure RFP — Analysis</span>
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">42 requirements</span>
            </div>
            <ul className="space-y-2">
              {MOCK_REQUIREMENTS.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 text-sm">
                  <span className="min-w-0">
                    <span className="mr-2 font-mono text-xs text-slate-500">{r.id}</span>
                    {r.text}
                  </span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${r.tone}`}>{r.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight">Everything you need to respond faster</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight">How it works</h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step} className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-white">
                {i + 1}
              </span>
              <p className="mt-3 font-medium">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight">Simple pricing</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-xl border bg-white p-6 ${plan.highlight ? "border-slate-900 shadow-lg" : "border-slate-200"}`}
              >
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-2">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-slate-600"> / month</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6 min-h-11" variant={plan.highlight ? "default" : "outline"}>
                  <Link href="/register">Start Trial</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-16 text-center text-white">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-bold tracking-tight">Start winning more RFPs today.</h2>
          <p className="mt-2 text-slate-300">No credit card required.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6 min-h-11">
            <Link href="/register">Start Free Trial</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
