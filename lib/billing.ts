import type { OrganizationRole } from "@/types/api";

export function isAdminOrOwner(role: OrganizationRole | null | undefined): boolean {
  if (role === null || role === undefined) return false;
  if (typeof role === "number") return role === 0 || role === 1;
  return role === "Owner" || role === "Admin";
}

/** Human label for a limit where -1 means unlimited. */
export function formatLimit(limit: number): string {
  return limit < 0 ? "Unlimited" : String(limit);
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  const ax = err as { response?: { data?: { message?: string } } };
  return ax.response?.data?.message || fallback;
}

const TIER_ORDER = ["Free", "Starter", "Professional", "Enterprise"];

export function tierName(tier: unknown): string {
  if (typeof tier === "number") return TIER_ORDER[tier] ?? String(tier);
  return String(tier ?? "Free");
}

export const TIER_BADGE_CLASS: Record<string, string> = {
  Free: "bg-slate-100 text-slate-700",
  Starter: "bg-blue-100 text-blue-800",
  Professional: "bg-violet-100 text-violet-800",
  Enterprise: "bg-amber-100 text-amber-800",
};
