import { auth } from "@clerk/nextjs/server";
import axios from "axios";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Resource } from "@/lib/resource-types";
import { getResource } from "@/lib/resources-api";

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
