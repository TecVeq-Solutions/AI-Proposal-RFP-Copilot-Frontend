"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/** Last-resort boundary for errors in the root layout itself (Day 71: reported to Sentry when configured). */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
          <p className="text-sm text-slate-600">An unexpected error occurred. Please try again.</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
