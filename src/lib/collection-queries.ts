import { auth } from "@clerk/nextjs/server";
import axios from "axios";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Collection } from "@/lib/collection-types";
import {
  getCollection,
  listCollectionResources,
  listMyCollections,
  listPublicCollections,
} from "@/lib/collections-api";
import type { PaginatedResources } from "@/lib/resource-types";

/**
 * Server-side collection reads.
 *
 * `cache` dedupes within a single render pass, so a page that needs a collection
 * in both `generateMetadata` and its body fetches it once instead of twice.
 */

/**
 * The caller's own collections.
 *
 * The token is fetched here rather than left to the shared Axios instance,
 * because that instance's JWT interceptor only exists in the browser bundle —
 * `AuthTokenSetter` installs it from a `useEffect`. A Server Component therefore
 * has to attach the header itself, exactly as `getMySettingsForViewer` does.
 *
 * An earlier version of this called `listMyCollections()` with no token and
 * argued that the backend "knows who the caller is" because `auth()` identified
 * them. That is wrong, and it 401'd: the backend learns who the caller is from
 * the `Authorization` header, not from anything server-side. A server-side
 * identity it can read is not a credential it can verify.
 *
 * The viewer is part of the cache key for the same reason it is in
 * {@link getCachedProfile}: the answer is per-account, and a key that did not
 * name the account would be one refactor away from serving one person's
 * collections to another.
 *
 * The parameter is unused in the body on purpose — the token comes from `auth()`
 * rather than from the id — so it is underscore-prefixed to say "this exists to
 * be a memo key". Do not drop it, and do not pass the caller without it.
 *
 * `resourceId` is optional and widens the answer rather than narrowing it: pass
 * it and each row also reports `containsResource`, which is what a resource
 * page's save control needs in order to render its own state correctly. Leaving
 * it off would mean that control fetching for itself on open, and a
 * "is this saved?" button that reads wrong until you touch it is worse than the
 * request it saves.
 */
export const getCachedMyCollections = cache(
  async (_viewerId: string, resourceId?: string) => {
    const { getToken } = await auth();

    return listMyCollections({
      resourceId,
      token: (await getToken()) ?? undefined,
    });
  },
);

/**
 * One owner's public collections, for their profile page.
 *
 * Cached on the handle, and not on the viewer: the backend filters private
 * collections out in the query, so every viewer gets the same answer. That is the
 * opposite of {@link getCollectionForViewer}, where the viewer genuinely changes
 * the result and therefore has to be part of the key.
 */
export const getCachedPublicCollections = cache((username: string) =>
  listPublicCollections(username),
);

/**
 * A collection as the signed-in user, so a private one is not 404'd.
 *
 * The same asymmetry `getResourceForViewer` exists for: a public read carries no
 * token, so the backend cannot tell the owner from a stranger, and a private
 * collection would then be unreachable for the one person who may see it. The
 * detail page needs the un-redacted payload anyway, because it has to know the
 * stored `isPrivate` and `isOwner` to render the owner's own affordances.
 *
 * The viewer is part of the cache key, because the answer genuinely differs by
 * viewer: an owner of a private collection gets it, a stranger gets a 404.
 * Sharing one cached entry would 404 it for its owner.
 */
export async function getCollectionForViewer(id: string): Promise<Collection> {
  const { userId, getToken } = await auth();

  if (!userId) return getCollection(id);

  return getCollection(id, (await getToken()) ?? undefined);
}

export async function getCollectionResourcesForViewer(
  id: string,
): Promise<PaginatedResources> {
  const { userId, getToken } = await auth();

  if (!userId) return listCollectionResources(id);

  return listCollectionResources(id, {
    token: (await getToken()) ?? undefined,
  });
}

/**
 * Turns a 404 into the app's 404 page.
 *
 * A private collection is a 404 on the wire, not a 403 — the owner declined to
 * confirm it exists — so this maps cleanly.
 *
 * Note the HTTP status will be 200, not 404, when this runs during a streamed
 * render, which it does wherever the segment has a `loading.tsx`. That is
 * Next.js's documented behaviour, not a fault: once the response has begun
 * streaming the status can no longer be changed. Next compensates by injecting
 * `<meta name="robots" content="noindex">`.
 *
 * `/collections/[id]` deliberately has **no** `loading.tsx` for the same reason
 * `/resources/[id]` does not: without a Suspense boundary the status is still
 * open when `notFound()` runs, so the real 404 survives. See
 * `docs/collections.md`.
 *
 * Anything else is rethrown. A backend that is down is a fault the error
 * boundary should report, not evidence that a collection does not exist —
 * collapsing both into `notFound()` would make an outage look like an empty
 * database.
 */
async function orNotFound(
  load: () => Promise<Collection>,
): Promise<Collection> {
  try {
    return await load();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      notFound();
    }

    throw error;
  }
}

/** Turns a 404 on the collection's *contents* into the app's 404 page. */
async function resourcesOrNotFound(
  load: () => Promise<PaginatedResources>,
): Promise<PaginatedResources> {
  try {
    return await load();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      notFound();
    }

    throw error;
  }
}

export function getCollectionOrNotFound(id: string): Promise<Collection> {
  return orNotFound(() => getCollectionForViewer(id));
}

export function getCollectionResourcesOrNotFound(
  id: string,
): Promise<PaginatedResources> {
  return resourcesOrNotFound(() => getCollectionResourcesForViewer(id));
}
