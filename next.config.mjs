import createMDX from "@next/mdx";
import bundleAnalyzer from "@next/bundle-analyzer";
// In @sentry/nextjs v11 the build-time helper lives in the dedicated "/config" entry point.
import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for lean production Docker image (Day 5)
  output: "standalone",
  // Lets CI / one-off builds avoid clobbering a running `next dev` (both use .next by default).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Day 76: user docs are MDX pages under app/docs.
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  // Day 71: loads instrumentation.ts (Sentry server/edge init) on Next 14.
  experimental: { instrumentationHook: true },
};

const withMDX = createMDX({});
// Day 72: `ANALYZE=true npm run build` opens the bundle report.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

// Day 71: Sentry error tracking. Source-map upload only happens when SENTRY_AUTH_TOKEN is provided (CI/prod);
// without a DSN the SDK is a no-op, so local dev and tests are unaffected.
export default withSentryConfig(withBundleAnalyzer(withMDX(nextConfig)), {
  silent: true,
  telemetry: false,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
