"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  clearAuth,
  clearAuthCookie,
  decodeJwtPayload,
  getOrgId,
  getToken,
  saveOrgId,
} from "@/lib/auth";
import type { ApiResponse, Organization, User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  organizations: Organization[];
  currentOrg: Organization | null;
  loading: boolean;
  setCurrentOrgId: (orgId: string) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setOrganizations([]);
      setCurrentOrgIdState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const payload = decodeJwtPayload<Record<string, string>>(token);
      if (payload) {
        const id =
          payload.sub ??
          payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
          "";
        const email =
          payload.email ??
          payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ??
          "";
        const firstName = payload.firstName ?? payload.given_name ?? "";
        const lastName = payload.lastName ?? payload.family_name ?? "";
        setUser({ id, email, firstName, lastName, createdAt: "" });
      }

      const [meRes, orgsRes] = await Promise.all([
        api.get<ApiResponse<User>>("/api/auth/me"),
        api.get<ApiResponse<Organization[]>>("/api/organizations"),
      ]);

      if (meRes.data.success && meRes.data.data) {
        setUser(meRes.data.data);
      }

      const orgs = orgsRes.data.success && orgsRes.data.data ? orgsRes.data.data : [];
      setOrganizations(orgs);

      const stored = getOrgId();
      const nextOrgId =
        (stored && orgs.some((o) => o.id === stored) && stored) ||
        orgs[0]?.id ||
        null;

      if (nextOrgId) {
        saveOrgId(nextOrgId);
        setCurrentOrgIdState(nextOrgId);
      } else {
        setCurrentOrgIdState(null);
      }
    } catch {
      setUser(null);
      setOrganizations([]);
      setCurrentOrgIdState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setCurrentOrgId = useCallback((orgId: string) => {
    saveOrgId(orgId);
    setCurrentOrgIdState(orgId);
  }, []);

  const logout = useCallback(async () => {
    clearAuth();
    await clearAuthCookie();
    setUser(null);
    setOrganizations([]);
    setCurrentOrgIdState(null);
    router.replace("/login");
  }, [router]);

  const currentOrg = useMemo(
    () => organizations.find((o) => o.id === currentOrgId) ?? null,
    [organizations, currentOrgId]
  );

  const value = useMemo(
    () => ({
      user,
      organizations,
      currentOrg,
      loading,
      setCurrentOrgId,
      refresh,
      logout,
    }),
    [user, organizations, currentOrg, loading, setCurrentOrgId, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
