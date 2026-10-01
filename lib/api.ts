import axios from "axios";
import { toast } from "sonner";
import { clearAuth, getOrgId, getToken, removeToken } from "@/lib/auth";
import { PLAN_LIMIT_EVENT } from "@/components/upgrade-prompt-modal";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Suppress the global error toast for this request (caller handles the error itself). */
    skipErrorToast?: boolean;
  }
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const orgId = getOrgId();
  if (orgId) {
    config.headers["X-Org-Id"] = orgId;
  }

  return config;
});

function extractMessage(data: unknown): string | undefined {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return undefined;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof window === "undefined") return Promise.reject(error);

    // Login/register forms render their own inline errors.
    const url: string = error.config?.url ?? "";
    const isAuthForm = url.includes("/api/auth/login") || url.includes("/api/auth/register");
    const silent = Boolean(error.config?.skipErrorToast) || isAuthForm;
    const status: number | undefined = error.response?.status;
    const message = extractMessage(error.response?.data);

    if (!error.response) {
      if (!silent && error.code !== "ERR_CANCELED") toast.error("Check your internet connection");
      return Promise.reject(error);
    }

    switch (status) {
      case 400:
        if (!silent) toast.error(message ? `Invalid request: ${message}` : "Invalid request");
        break;
      case 401: {
        const onLoginPage = window.location.pathname.startsWith("/login");
        if (!onLoginPage && !silent) toast.error("Session expired");
        clearAuth();
        removeToken();
        try {
          await fetch("/api/set-cookie", { method: "DELETE" });
        } catch {
          // ignore cookie clear failures
        }
        if (!onLoginPage) {
          window.location.href = "/login";
        }
        break;
      }
      case 402:
        window.dispatchEvent(
          new CustomEvent(PLAN_LIMIT_EVENT, {
            detail: {
              message: message ?? "You've reached a limit on your current plan.",
              upgradeUrl: error.response.data?.upgradeUrl,
            },
          })
        );
        break;
      case 403:
        if (!silent) toast.error("You don't have permission");
        break;
      case 404:
        if (!silent) toast.error("Resource not found");
        break;
      case 429:
        if (!silent) toast.warning("Too many requests. Please wait.");
        break;
      default:
        if (!silent && status !== undefined && status >= 500) {
          toast.error("Something went wrong. Please try again.");
        }
    }

    return Promise.reject(error);
  }
);

export default api;
