"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import axios from "axios";
import api from "@/lib/api";
import { saveOrgId, saveToken, setAuthCookie } from "@/lib/auth";
import type { ApiResponse, AuthResponse, Organization } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");

  const [orgName, setOrgName] = useState("");
  const slugPreview = useMemo(() => toSlug(orgName) || "your-workspace", [orgName]);

  async function onCreateAccount(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError("Password must include uppercase, lowercase, and a digit.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post<ApiResponse<AuthResponse>>("/api/auth/register", {
        firstName,
        lastName,
        email,
        password,
        promoCode: promoCode.trim() || undefined,
      });

      if (!data.success || !data.data?.token) {
        setError(data.message || "Registration failed.");
        return;
      }

      saveToken(data.data.token);
      await setAuthCookie(data.data.token);
      setStep(2);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          (err.response?.data as ApiResponse<unknown> | undefined)?.message ??
          "Registration failed.";
        setError(message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onCreateWorkspace(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const name = orgName.trim();
    if (!name) {
      setError("Organization name is required.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post<ApiResponse<Organization>>("/api/organizations", {
        name,
        slug: toSlug(name) || undefined,
      });

      if (!data.success || !data.data) {
        setError(data.message || "Could not create workspace.");
        return;
      }

      saveOrgId(data.data.id);
      router.replace("/dashboard");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          (err.response?.data as ApiResponse<unknown> | undefined)?.message ??
          "Could not create workspace.";
        setError(message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Step {step} of 2
        </p>
        <CardTitle className="text-2xl">
          {step === 1 ? "Create your account" : "Set up your workspace"}
        </CardTitle>
        <CardDescription>
          {step === 1
            ? "Start with your personal details."
            : "Name the organization you'll use for proposals and RFPs."}
        </CardDescription>
        <div className="mt-2 flex gap-2">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-slate-900" : "bg-slate-200"}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-slate-900" : "bg-slate-200"}`} />
        </div>
      </CardHeader>

      {step === 1 ? (
        <form onSubmit={onCreateAccount}>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promoCode">Invite / promo code (optional)</Label>
              <Input
                id="promoCode"
                autoComplete="off"
                maxLength={50}
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="BETA2026"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create Account"
              )}
            </Button>
            <p className="text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-slate-900 underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      ) : (
        <form onSubmit={onCreateWorkspace}>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Consulting"
              />
              <p className="text-xs text-slate-500">
                Slug preview: <span className="font-mono text-slate-700">{slugPreview}</span>
              </p>
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating workspace…
                </>
              ) : (
                "Create Workspace"
              )}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
