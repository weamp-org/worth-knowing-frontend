import { auth } from "@clerk/nextjs/server";
import axios from "axios";
import { notFound } from "next/navigation";
import { cache } from "react";
import { isForbidden, isNotFound } from "@/lib/api-error";
import type { PaginatedResourceReports } from "@/lib/comment-types";
import type { Resource } from "@/lib/resource-types";
import {
  getRandomResource,
  getResource,
  listResourceReports,
} from "@/lib/resources-api";

/**
 * Server-side reads.
 *
 * `cache` dedupes within a single render pass, so a page that needs a resource
 * in both `generateMetadata` and its body fetches it once instead of twice.
 */
export const getCachedResource = cache((id: string) => getResource(id));

/**
 * Fetch a resource as the signed-in user, so an anonymous one is not redacted.
 *
 * The edit form needs the real payload: it has to know the stored
 * `isAnonymous` to pre-fill the toggle, and the ownership guard needs the
 * contributor. Public reads go through {@link getCachedResource}, which carries
 * no token and therefore gets the redacted shape.
 */
export async function getResourceForViewer(id: string): Promise<Resource> {
  const { getToken } = await auth();

  return getResource(id, (await getToken()) ?? undefined);
}

/**
 * Turns a 404 into the app's 404 page.
 *
 * Note the HTTP status will be 200, not 404, when this runs during a streamed
 * render — which it does, because `src/app/loading.tsx` puts every route behind
 * a Suspense boundary. That is Next.js's documented behaviour, not a fault:
 * once the response has begun streaming the status can no longer be changed.
 * Next compensates by injecting `<meta name="robots" content="noindex">`, so
 * these stay out of search results.
 *
 * Deliberately left alone. Getting a real 404 means checking existence in
 * `proxy.ts` before the render starts, which costs an extra backend round trip
 * on every resource view and duplicates the fetch below. Verified not worth it
 * for a page nobody indexes. See `docs/resources.md`.
 *
 * Anything else is rethrown. A backend that is down or erroring is a fault the
 * error boundary should report, not evidence that the resource does not exist —
 * collapsing both into `notFound()` would make an outage look like an empty
 * database.
 */
async function orNotFound(load: () => Promise<Resource>): Promise<Resource> {
  try {
    return await load();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      notFound();
    }

    throw error;
  }
}

/** Public read. Redacts an anonymous resource, since no viewer is passed. */
export function getResourceOrNotFound(id: string): Promise<Resource> {
  return orNotFound(() => getCachedResource(id));
}

/** Authenticated read. Un-redacted for the owner, so usable by the edit page. */
export function getResourceForViewerOrNotFound(id: string): Promise<Resource> {
  return orNotFound(() => getResourceForViewer(id));
}

/**
 * The resource moderation queue, or `null` when the caller is not allowed to see it.
 *
 * Same shape and the same `403`-to-`null` reasoning as
 * `getCommentReportsForViewer`: "you are not an admin" is a state the moderation page
 * renders, not a fault worth throwing to the error boundary.
 */
export async function getResourceReportsForViewer(): Promise<PaginatedResourceReports | null> {
  const { getToken } = await auth();

  try {
    return await listResourceReports({}, (await getToken()) ?? undefined);
  } catch (error) {
    if (isForbidden(error)) return null;

    throw error;
  }
}

/**
 * One random resource for the home page's surprise card, or `null` when the site
 * has none.
 *
 * The `404`-to-`null` counterpart to {@link getResourceReportsForViewer}, and for
 * the same reason: an empty corpus is a state the home page renders *by rendering
 * nothing at all*, not a fault. The surprise section collapses rather than
 * showing an error, which is the same rule the most-saved rail follows.
 *
 * Nulling it here rather than in the page is what keeps the request **inside the
 * home page's `Promise.all`**. A 404 thrown from any member of that `all` rejects
 * the whole thing, so an empty site would take the entire home page down with it —
 * a fresh database answering 500 on the front page. Swallowing it at this boundary
 * is what lets the section be genuinely optional while still costing no extra
 * round trip.
 *
 * Anything else is rethrown, for {@link getResourceReportsForViewer}'s reason: a
 * backend that is down is a fault, and it must not render as an empty site.
 */
export async function getRandomResourceOrNull(): Promise<Resource | null> {
  try {
    return await getRandomResource();
  } catch (error) {
    if (isNotFound(error)) return null;

    throw error;
  }
}
