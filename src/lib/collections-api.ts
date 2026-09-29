import api from "@/lib/api";
import type {
  Collection,
  CollectionInput,
  PaginatedCollections,
} from "@/lib/collection-types";
import type { PaginatedResources } from "@/lib/resource-types";

/**
 * Collection reads and writes.
 *
 * Every call goes through the shared `api` instance, for the reason
 * `resources-api.ts` documents: `AuthTokenSetter` installs the Clerk JWT
 * interceptor on that one instance, so anything else would be unauthenticated.
 *
 * `GET /collections/:id` and `GET /collections/:id/resources` are `@Public()`, so
 * they work from a Server Component with no session. Both still accept a token,
 * because a private collection resolves only for its owner — see
 * {@link getCollection} and {@link listCollectionResources}.
 */

export interface ListMyCollectionsParams {
  /**
   * Report per collection whether it already holds this resource.
   *
   * This is what makes the picker on a resource page one request rather than one
   * per collection, so send it whenever a resource is in hand.
   */
  resourceId?: string;
  /**
   * A Clerk session token.
   *
   * Required on a Server Component, and supplied automatically in the browser by
   * the interceptor on the shared instance.
   */
  token?: string;
}

/**
 * The caller's own collections.
 *
 * A token is **required**. This route is behind `ClerkAuthGuard`, which reads the
 * `Authorization` header — the one place the shared `api` instance is not enough,
 * because the JWT interceptor only exists in the browser bundle. A Server
 * Component calling this without a token gets a 401, and `auth()` alone is not
 * the credential: the backend learns who the caller is from the header, not from
 * anything server-side. See `getCachedMyCollections` for the server-side wrapper.
 */
export async function listMyCollections(
  options: ListMyCollectionsParams = {},
): Promise<PaginatedCollections> {
  const { resourceId, token } = options;

  const response = await api.get<PaginatedCollections>("/collections/me", {
    // Send nothing rather than `undefined`, so axios leaves absent params out of
    // the query string entirely.
    params: {
      ...(resourceId ? { resourceId } : {}),
    },
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });

  return response.data;
}

/**
 * One collection.
 *
 * A token is needed for a private one: without it the backend cannot tell its
 * owner from a stranger, and the collection then 404s for its own owner. Public
 * reads leave it off and get the redacted shape.
 */
export async function getCollection(
  id: string,
  token?: string,
): Promise<Collection> {
  const response = await api.get<Collection>(
    `/collections/${encodeURIComponent(id)}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );

  return response.data;
}

/**
 * A collection's contents, in the order they were collected.
 *
 * Same envelope and same cursor as the resource feed, so a collection page can
 * reuse its "load more" without a second pagination shape. The items are
 * resources, redacted exactly as they would be on `GET /resources`.
 */
export async function listCollectionResources(
  id: string,
  options: { cursor?: string; token?: string; limit?: number } = {},
): Promise<PaginatedResources> {
  const { cursor, token, limit } = options;

  const response = await api.get<PaginatedResources>(
    `/collections/${encodeURIComponent(id)}/resources`,
    {
      params: {
        ...(cursor ? { cursor } : {}),
        ...(limit ? { limit } : {}),
      },
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    },
  );

  return response.data;
}

/**
 * Public collections, newest first.
 *
 * `owner` is a username, and passing it is how a profile page lists that
 * person's public collections. The backend filters private ones out in the query,
 * so this can never surface one.
 *
 * Not currently reachable from a global browse UI — that is a product decision,
 * not a limitation of the route, which will list everything public when called
 * without `owner`.
 */
export async function listPublicCollections(
  owner?: string,
): Promise<PaginatedCollections> {
  const response = await api.get<PaginatedCollections>("/collections", {
    params: owner ? { owner } : undefined,
  });

  return response.data;
}

export async function createCollection(
  input: CollectionInput,
): Promise<Collection> {
  const response = await api.post<Collection>("/collections", input);

  return response.data;
}

export async function updateCollection(
  id: string,
  input: Partial<CollectionInput>,
): Promise<Collection> {
  const response = await api.patch<Collection>(
    `/collections/${encodeURIComponent(id)}`,
    input,
  );

  return response.data;
}

/**
 * Deletes the collection.
 *
 * The resources inside are untouched — they keep their own attribution and stay
 * on the site. Only the owner's arrangement of them goes, and the join rows go
 * with the cascade.
 */
export async function deleteCollection(id: string): Promise<Collection> {
  const response = await api.delete<Collection>(
    `/collections/${encodeURIComponent(id)}`,
  );

  return response.data;
}

/**
 * Adds a resource to a collection. Any resource, not only the caller's own.
 *
 * Idempotent — adding one that is already there succeeds and changes nothing —
 * so the response is a 200 and the caller can fire and forget. A rejected double
 * click would be a worse experience than a no-op, and `isPending` on the button
 * already prevents the common case.
 */
export async function addResourceToCollection(
  id: string,
  resourceId: string,
): Promise<Collection> {
  const response = await api.post<Collection>(
    `/collections/${encodeURIComponent(id)}/resources`,
    { resourceId },
  );

  return response.data;
}

/**
 * Removes a resource from a collection. Idempotent for the same reason.
 *
 * Also returns the collection rather than nothing, so the count on the page can
 * be updated without a second read.
 */
export async function removeResourceFromCollection(
  id: string,
  resourceId: string,
): Promise<Collection> {
  const response = await api.delete<Collection>(
    `/collections/${encodeURIComponent(id)}/resources/${encodeURIComponent(resourceId)}`,
  );

  return response.data;
}
