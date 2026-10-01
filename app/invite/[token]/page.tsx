"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { ApiResponse, InvitationPublic, OrganizationMember } from "@/types/api";

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [invite, setInvite] = useState<InvitationPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<ApiResponse<InvitationPublic>>(`/api/invitations/${token}`);
        if (!res.data.success || !res.data.data) {
          setError(res.data.message || "Invitation not found.");
          return;
        }
        setInvite(res.data.data);
      } catch (err: unknown) {
        const ax = err as { response?: { data?: { message?: string } } };
        setError(ax.response?.data?.message || "Invitation not found.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token]);

  async function accept() {
    if (!getToken()) {
      router.push(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
      return;
    }

    setAccepting(true);
    try {
      const res = await api.post<ApiResponse<OrganizationMember>>(
        `/api/invitations/${token}/accept`
      );
      if (!res.data.success) {
        toast.error(res.data.message || "Could not accept invitation.");
        return;
      }
      toast.success("Invitation accepted");
      router.replace("/dashboard");
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading invitation…</p>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
        <h1 className="text-xl font-semibold text-slate-900">Invalid invitation</h1>
        <p className="text-sm text-slate-600">{error}</p>
        <Button asChild>
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
    );
  }

  const blocked =
    invite.isExpired ||
    String(invite.status) === "Expired" ||
    String(invite.status) === "Revoked" ||
    String(invite.status) === "Accepted";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Team invitation</h1>
        <p className="text-sm text-slate-600">
          You&apos;ve been invited to join <strong>{invite.organizationName}</strong> as{" "}
          <strong>{String(invite.role)}</strong>.
        </p>
        <p className="text-sm text-slate-500">
          Invitation email: <span className="font-medium text-slate-700">{invite.email}</span>
        </p>
        {blocked ? (
          <p className="text-sm text-amber-700">
            This invitation is no longer valid ({String(invite.status)}).
          </p>
        ) : (
          <Button type="button" className="w-full" onClick={() => void accept()} disabled={accepting}>
            {accepting ? "Accepting…" : getToken() ? "Accept invitation" : "Sign in to accept"}
          </Button>
        )}
        <Button asChild variant="ghost" className="w-full">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
