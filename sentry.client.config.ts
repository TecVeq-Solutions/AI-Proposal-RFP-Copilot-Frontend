import * as Sentry from "@sentry/nextjs";

// Day 71: no-op unless NEXT_PUBLIC_SENTRY_DSN is set (never in local dev or CI).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  tracesSampleRate: 0.1,
  // Expected API errors (401/403/404) are handled in lib/api.ts and are not bugs.
  ignoreErrors: [/Request failed with status code (401|403|404)/, "ERR_CANCELED"],
});
