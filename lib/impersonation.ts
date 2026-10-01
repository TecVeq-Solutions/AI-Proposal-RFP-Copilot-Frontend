import { getOrgId, getToken, saveOrgId, saveToken, setAuthCookie } from "@/lib/auth";

const ADMIN_TOKEN_KEY = "rfp_admin_token";
const ADMIN_ORG_KEY = "rfp_admin_org_id";
const IMPERSONATING_KEY = "rfp_impersonating";

/** Day 61: switch the session to the impersonation token, remembering the admin's own session. */
export async function startImpersonation(
  token: string,
  organizationId: string | null,
  label: string
): Promise<void> {
  const adminToken = getToken();
  // Nested impersonation would lose the real admin session, so keep the very first one.
  if (adminToken && !sessionStorage.getItem(ADMIN_TOKEN_KEY)) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    sessionStorage.setItem(ADMIN_ORG_KEY, getOrgId() ?? "");
  }
  sessionStorage.setItem(IMPERSONATING_KEY, label);

  saveToken(token);
  if (organizationId) saveOrgId(organizationId);
  await setAuthCookie(token);
}

export function getImpersonationLabel(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(IMPERSONATING_KEY);
}

/** Restores the admin's own session. Returns false when there is nothing to restore. */
export async function stopImpersonation(): Promise<boolean> {
  const adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (!adminToken) return false;

  saveToken(adminToken);
  const adminOrg = sessionStorage.getItem(ADMIN_ORG_KEY);
  if (adminOrg) saveOrgId(adminOrg);
  await setAuthCookie(adminToken);

  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_ORG_KEY);
  sessionStorage.removeItem(IMPERSONATING_KEY);
  return true;
}
