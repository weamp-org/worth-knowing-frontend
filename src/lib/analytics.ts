import type { BeforeSendFn, CaptureResult, Properties } from "posthog-js";
import posthog from "posthog-js";

import { getHostname } from "@/lib/format";

/**
 * V1 product analytics for Worth Knowing (PostHog Cloud EU, frontend-only).
 *
 * Nine domain events plus automatic `$pageview`, and nothing else. Every
 * property below is an opaque id, a closed enum, a bucket, a boolean, or a
 * count. No titles, URLs, `why` text, comment bodies, tag names, usernames,
 * contributor names, bios, emails, or avatars are ever sent — the track
 * functions take only the fields they forward, so there is no object a caller
 * could accidentally pass free text through.
 *
 * This module is safe to import from client components. All PostHog calls are
 * guarded on successful initialization, and every public function no-ops on
 * the server and when analytics is disabled or opted out, so analytics can
 * never break the product.
 */

/** Where a resource view came from. `direct` is the honest default. */
export const DISCOVERY_SOURCES = [
  "feed",
  "browse",
  "search",
  "tag",
  "profile",
  "collection",
  "surprise",
  "saved_list",
  "direct",
  "external",
] as const;

export type DiscoverySource = (typeof DISCOVERY_SOURCES)[number];

function isDiscoverySource(value: unknown): value is DiscoverySource {
  return (
    typeof value === "string" &&
    (DISCOVERY_SOURCES as readonly string[]).includes(value)
  );
}

/**
 * Ephemeral discovery attribution: in-memory state plus `sessionStorage`.
 *
 * A resource-link click stores where the reader was; the detail view consumes
 * it once when `resource_viewed` fires. Single-use on purpose: a value that
 * lingered would attribute a later, unrelated view to an earlier surface.
 * A new tab, a reload, or a render without a preceding click finds nothing
 * stored and reports `direct`, which is the truthful answer in each case.
 *
 * Deliberately not query parameters (they would pollute shareable and
 * canonical URLs), not PostHog super-properties (attribution is per
 * navigation, not per person), and not `localStorage` (a source from days ago
 * must not follow the reader around).
 */
const DISCOVERY_STORAGE_KEY = "wk.discovery-source";

let memorySource: DiscoverySource | null = null;
/** The source consumed by the most recent `resource_viewed`, for engagement
 *  events on that same view (open, save). Falls back to `direct`. */
let lastViewSource: DiscoverySource = "direct";

function readStoredSource(): DiscoverySource | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(DISCOVERY_STORAGE_KEY);
    return isDiscoverySource(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Called by resource-link click handlers. Never called with free text. */
export function setDiscoverySource(source: DiscoverySource): void {
  memorySource = source;
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DISCOVERY_STORAGE_KEY, source);
    }
  } catch {
    // Storage may be unavailable (private mode quota); memory still covers
    // same-tab SPA navigations, and the fallback is `direct`, not a crash.
  }
}

/**
 * Called once when `resource_viewed` fires. Reads the stored source, clears
 * it so it cannot leak into a later view, and remembers it for engagement
 * events on this same view.
 */
export function consumeDiscoverySource(): DiscoverySource {
  const source = memorySource ?? readStoredSource() ?? "direct";
  memorySource = null;
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(DISCOVERY_STORAGE_KEY);
    }
  } catch {
    // Already cleared in memory; the stored copy expiring with the tab is
    // harmless because nothing reads it without the memory value agreeing.
  }
  lastViewSource = source;
  return source;
}

/** The source of the view currently on screen, for open/save events. */
export function peekViewSource(): DiscoverySource {
  return lastViewSource;
}

/** Bucketed query length. The raw query is never forwarded anywhere. */
export function queryLengthBucket(
  length: number,
): "1-3" | "4-10" | "11-25" | "26+" {
  if (length <= 3) return "1-3";
  if (length <= 10) return "4-10";
  if (length <= 25) return "11-25";
  return "26+";
}

/** Bucketed tag count. Tag names are never sent. */
export function tagCountBucket(count: number): "0" | "1-2" | "3-5" {
  if (count <= 0) return "0";
  if (count <= 2) return "1-2";
  return "3-5";
}

let isReady = false;
/** Latest Clerk user id seen (null = signed out, undefined = not seen yet). */
let pendingUserId: string | null | undefined;
let identifiedUserId: string | null = null;

function isUsable(): boolean {
  if (!isReady) return false;
  try {
    return !posthog.has_opted_out_capturing();
  } catch {
    return false;
  }
}

function applyIdentity(): void {
  if (!isReady || pendingUserId === undefined) return;
  try {
    if (pendingUserId) {
      // No properties argument: zero custom person properties, by policy.
      // The anonymous history merges into the identified person automatically.
      if (identifiedUserId !== pendingUserId) {
        posthog.identify(pendingUserId);
        identifiedUserId = pendingUserId;
      }
    } else if (identifiedUserId !== null) {
      // Signed-out transition only. Anonymous mounts never reach for `reset`,
      // which would rotate the anonymous id and fragment the journey.
      posthog.reset();
      identifiedUserId = null;
    }
  } catch {
    // Identity sync must never break sign-in or sign-out flows.
  }
}

/**
 * Called whenever Clerk auth state resolves. Safe to call on every render:
 * repeat calls with the same id are ignored, and `reset` runs only on a
 * genuine identified → signed-out transition.
 */
export function syncAnalyticsIdentity(userId: string | null): void {
  pendingUserId = userId;
  applyIdentity();
}

export function captureEvent(
  event: string,
  properties: Record<string, string | number | boolean>,
): void {
  if (!isUsable()) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // Analytics must never break the product.
  }
}

/**
 * Query params PostHog may keep on pageview URLs. Everything else — notably
 * `q`, the raw search text — is dropped before sending. `utm_term` is
 * excluded on purpose: it can carry typed search terms from elsewhere.
 */
const KEPT_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
]);

/**
 * Profile URLs contain the handle (`/u/adal`), which analytics must not
 * receive. The route shape is kept so `/u/...` pageviews still aggregate as
 * profile views, without identifying whose.
 */
function redactProfilePath(pathname: string): string {
  return pathname.replace(/^\/u\/[^/?#]+/, "/u/[profile]");
}

function sanitizeUrl(value: unknown): unknown {
  if (typeof value !== "string" || value.length === 0) return value;
  let url: URL;
  try {
    url =
      value.startsWith("/") && typeof window !== "undefined"
        ? new URL(value, window.location.origin)
        : new URL(value);
  } catch {
    return undefined;
  }
  const kept = new URLSearchParams();
  for (const key of KEPT_QUERY_PARAMS) {
    const param = url.searchParams.get(key);
    if (param) kept.set(key, param);
  }
  const query = kept.toString();
  return `${url.origin}${redactProfilePath(url.pathname)}${query ? `?${query}` : ""}`;
}

function sanitizePath(value: unknown): unknown {
  if (typeof value !== "string" || value.length === 0) return value;
  return redactProfilePath(value.split(/[?#]/)[0]);
}

/** Pageview URL properties that may carry query text or handles. */
const URL_PROPERTIES = new Set([
  "$current_url",
  "$pathname",
  "$referrer",
  "$initial_current_url",
  "$initial_pathname",
  "$initial_referrer",
  "$initial_referring_domain",
]);

/**
 * Custom properties each V1 event may carry. Anything else on one of these
 * events is deleted before sending, so a future edit cannot accidentally add
 * free text or identity to analytics by passing one more field.
 */
const EVENT_PROPERTY_ALLOWLIST: Record<string, readonly string[]> = {
  resource_viewed: ["resource_id", "source", "is_authenticated"],
  search_performed: [
    "query_length_bucket",
    "has_tag_filter",
    "has_type_filter",
    "has_access_filter",
    "result_count",
    "sort",
    "is_authenticated",
  ],
  resource_opened: [
    "resource_id",
    "location",
    "destination_host",
    "source",
    "is_authenticated",
  ],
  resource_saved: ["resource_id", "source", "location", "is_authenticated"],
  resource_unsaved: ["resource_id", "source", "location", "is_authenticated"],
  collection_created: [
    "collection_id",
    "is_private",
    "had_description",
    "is_authenticated",
  ],
  resource_added_to_collection: [
    "collection_id",
    "resource_id",
    "source",
    "is_authenticated",
  ],
  comment_added: ["resource_id", "is_reply", "is_authenticated"],
  resource_contributed: [
    "resource_id",
    "resource_type",
    "tag_count_bucket",
    "is_anonymous",
    "is_authenticated",
  ],
};

const sanitizeBeforeSend: BeforeSendFn = (
  event: CaptureResult | null,
): CaptureResult | null => {
  if (!event) return event;
  const properties: Properties = event.properties ?? {};
  for (const key of URL_PROPERTIES) {
    if (key in properties) {
      const sanitized =
        key === "$pathname" || key === "$initial_pathname"
          ? sanitizePath(properties[key])
          : sanitizeUrl(properties[key]);
      if (sanitized === undefined) {
        delete properties[key];
      } else {
        properties[key] = sanitized as Properties[string];
      }
    }
  }
  const allowed = EVENT_PROPERTY_ALLOWLIST[event.event];
  if (allowed) {
    for (const key of Object.keys(properties)) {
      if (key.startsWith("$")) continue;
      if (!allowed.includes(key)) delete properties[key];
    }
  }
  return event;
};

/**
 * Initializes PostHog. Called once from `instrumentation-client.ts`.
 * No-ops on the server and when the keys are absent (local dev without them),
 * so a missing configuration disables analytics rather than breaking pages.
 */
export function initAnalytics(): void {
  if (typeof window === "undefined" || isReady) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return;
  try {
    posthog.init(key, {
      api_host: host,
      capture_pageview: "history_change",
      autocapture: false,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_surveys: true,
      person_profiles: "identified_only",
      respect_dnt: true,
      secure_cookie: true,
      before_send: sanitizeBeforeSend,
    });
    isReady = true;
    applyIdentity();
  } catch {
    // Analytics must never break page load.
  }
}

export function trackResourceViewed(
  resourceId: string,
  isAuthenticated: boolean,
): void {
  captureEvent("resource_viewed", {
    resource_id: resourceId,
    source: consumeDiscoverySource(),
    is_authenticated: isAuthenticated,
  });
}

export function trackSearchPerformed(args: {
  queryLength: number;
  hasTagFilter: boolean;
  hasTypeFilter: boolean;
  hasAccessFilter: boolean;
  resultCount: number;
  sort: string;
  isAuthenticated: boolean;
}): void {
  captureEvent("search_performed", {
    query_length_bucket: queryLengthBucket(args.queryLength),
    has_tag_filter: args.hasTagFilter,
    has_type_filter: args.hasTypeFilter,
    has_access_filter: args.hasAccessFilter,
    result_count: args.resultCount,
    sort: args.sort,
    is_authenticated: args.isAuthenticated,
  });
}

export function trackResourceOpened(args: {
  resourceId: string;
  location: "card" | "detail";
  url: string;
  source?: DiscoverySource;
  isAuthenticated: boolean;
}): void {
  captureEvent("resource_opened", {
    resource_id: args.resourceId,
    location: args.location,
    // Host only. The full URL can carry tokens and personal paths.
    destination_host: getHostname(args.url),
    source: args.source ?? peekViewSource(),
    is_authenticated: args.isAuthenticated,
  });
}

function trackSaveToggled(
  event: "resource_saved" | "resource_unsaved",
  resourceId: string,
): void {
  captureEvent(event, {
    resource_id: resourceId,
    source: peekViewSource(),
    location: "detail",
    // Saves require authentication; the control never renders otherwise.
    is_authenticated: true,
  });
}

export function trackResourceSaved(resourceId: string): void {
  trackSaveToggled("resource_saved", resourceId);
}

export function trackResourceUnsaved(resourceId: string): void {
  trackSaveToggled("resource_unsaved", resourceId);
}

export function trackCollectionCreated(args: {
  collectionId: string;
  isPrivate: boolean;
  hadDescription: boolean;
}): void {
  captureEvent("collection_created", {
    collection_id: args.collectionId,
    is_private: args.isPrivate,
    had_description: args.hadDescription,
    is_authenticated: true,
  });
}

export function trackResourceAddedToCollection(args: {
  collectionId: string;
  resourceId: string;
}): void {
  captureEvent("resource_added_to_collection", {
    collection_id: args.collectionId,
    resource_id: args.resourceId,
    source: peekViewSource(),
    is_authenticated: true,
  });
}

export function trackCommentAdded(args: {
  resourceId: string;
  isReply: boolean;
}): void {
  captureEvent("comment_added", {
    resource_id: args.resourceId,
    is_reply: args.isReply,
    is_authenticated: true,
  });
}

export function trackResourceContributed(args: {
  resourceId: string;
  resourceType: string;
  tagCount: number;
  isAnonymous: boolean;
}): void {
  captureEvent("resource_contributed", {
    resource_id: args.resourceId,
    resource_type: args.resourceType,
    tag_count_bucket: tagCountBucket(args.tagCount),
    // Whether the contribution was shared anonymously. Never a handle: an
    // anonymous contribution stays unattributed in analytics, as in the app.
    is_anonymous: args.isAnonymous,
    is_authenticated: true,
  });
}

/** Whether the reader has opted out. Read on mount by the settings control. */
export function hasAnalyticsOptOut(): boolean {
  try {
    return isReady && posthog.has_opted_out_capturing();
  } catch {
    return false;
  }
}

/** Persists the reader's choice. Stops future capture; past events remain. */
export function setAnalyticsOptOut(optOut: boolean): void {
  if (!isReady) return;
  try {
    if (optOut) {
      posthog.opt_out_capturing();
    } else {
      posthog.opt_in_capturing();
    }
  } catch {
    // A failed preference write must not break settings.
  }
}
