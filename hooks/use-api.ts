"use client";

import { useCallback, useState } from "react";
import type { AxiosRequestConfig } from "axios";
import api from "@/lib/api";
import type { ApiResponse } from "@/types/api";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T = unknown>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const request = useCallback(async (config: AxiosRequestConfig) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await api.request<ApiResponse<T>>(config);
      const body = response.data;
      if (!body.success) {
        const message =
          body.errors?.length ? body.errors.join(" ") : body.message || "Request failed.";
        setState({ data: null, loading: false, error: message });
        return { ok: false as const, data: null, message };
      }
      setState({ data: body.data, loading: false, error: null });
      return { ok: true as const, data: body.data, message: body.message };
    } catch (err: unknown) {
      const ax = err as {
        response?: { data?: { message?: string; errors?: string[] } };
        message?: string;
      };
      const message =
        ax.response?.data?.errors?.join(" ") ||
        ax.response?.data?.message ||
        ax.message ||
        "Request failed.";
      setState({ data: null, loading: false, error: message });
      return { ok: false as const, data: null, message };
    }
  }, []);

  return { ...state, request };
}
