import { initAnalytics } from "./lib/analytics";

/**
 * Client-side startup. Runs once in the browser (never on the server, never
 * at build time) and initializes PostHog with the V1 configuration:
 * pageviews on history changes, no autocapture, no session recording, no
 * surveys, identified-only person profiles. See `src/lib/analytics.ts`.
 *
 * A no-op without `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` /
 * `NEXT_PUBLIC_POSTHOG_HOST`, so local dev without keys runs untracked.
 */
initAnalytics();
