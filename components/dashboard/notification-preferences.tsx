"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/billing";
import { cn } from "@/lib/utils";
import type { ApiResponse, NotificationPreference, NotificationType } from "@/types/api";

const QUERY_KEY = ["notification-preferences"];

const LABELS: Record<NotificationType, { title: string; description: string }> = {
  ProposalShared: {
    title: "Proposal shared with me",
    description: "Email me when someone shares a proposal with me.",
  },
  CommentAdded: {
    title: "Comments on my proposals",
    description: "Email me when a teammate comments on a proposal I created.",
  },
  RfpAnalysisComplete: {
    title: "RFP analysis complete",
    description: "Email me when an RFP analysis I started has finished processing.",
  },
  TeamInvite: {
    title: "Team invitations",
    description: "Email me when I am invited to join an organization.",
  },
};

export function NotificationPreferences() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<ApiResponse<NotificationPreference[]>>("/api/users/notification-preferences");
      return res.data.data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: (pref: NotificationPreference) =>
      api.patch("/api/users/notification-preferences", pref),
    // Optimistic: flip immediately, roll back if the server rejects it.
    onMutate: async (pref) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<NotificationPreference[]>(QUERY_KEY);
      queryClient.setQueryData<NotificationPreference[]>(QUERY_KEY, (old) =>
        (old ?? []).map((p) => (p.notificationType === pref.notificationType ? pref : p))
      );
      return { previous };
    },
    onError: (err, _pref, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(QUERY_KEY, ctx.previous);
      toast.error(apiErrorMessage(err, "Could not save your preference."));
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-medium text-slate-900">Email notifications</h2>
        <p className="text-sm text-slate-600">Choose which emails RFP Copilot sends you.</p>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="text-sm text-red-600">Could not load your notification preferences.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {query.data!.map((pref) => {
            const label = LABELS[pref.notificationType];
            return (
              <li key={pref.notificationType} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{label.title}</p>
                  <p className="text-sm text-slate-600">{label.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pref.emailEnabled}
                  aria-label={label.title}
                  onClick={() => toggle.mutate({ ...pref, emailEnabled: !pref.emailEnabled })}
                  className={cn(
                    "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                    pref.emailEnabled ? "bg-blue-600" : "bg-slate-300"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                      pref.emailEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
