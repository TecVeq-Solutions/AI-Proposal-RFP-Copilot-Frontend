const TOKEN_KEY = "rfp_token";
const ORG_KEY = "rfp_org_id";

export function saveToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function saveOrgId(orgId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ORG_KEY, orgId);
}

export function getOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ORG_KEY);
}

export function removeOrgId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ORG_KEY);
}

export function clearAuth(): void {
  removeToken();
  removeOrgId();
}

/** Decode JWT payload without verifying (client display only). */
export function decodeJwtPayload<T extends Record<string, unknown> = Record<string, unknown>>(
  token: string
): T | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  await fetch("/api/set-cookie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

export async function clearAuthCookie(): Promise<void> {
  await fetch("/api/set-cookie", { method: "DELETE" });
}
