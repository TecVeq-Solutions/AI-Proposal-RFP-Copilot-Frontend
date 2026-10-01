"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function BetaWaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [useCase, setUseCase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/beta/waitlist", { name, email, company, useCase });
      toast.success("Thanks! We'll be in touch.");
      setDone(true);
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Join the private beta</h1>
      <p className="mt-2 text-slate-600">
        Tell us a bit about you and we&apos;ll send an invite as soon as a spot opens up.
      </p>

      {done ? (
        <p role="status" className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          Thanks! We&apos;ll be in touch.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" maxLength={200} value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="useCase">How will you use it?</Label>
            <Textarea id="useCase" rows={4} maxLength={2000} value={useCase} onChange={(e) => setUseCase(e.target.value)} />
          </div>
          <Button type="submit" className="min-h-11 w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" /> Submitting…
              </>
            ) : (
              "Request access"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
