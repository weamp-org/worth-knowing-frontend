import api from "@/lib/api";
import type {
  PaginatedResources,
  Resource,
  ResourceInput,
  TagSearchResult,
} from "@/lib/resource-types";

/**
 * Every call goes through the shared `api` instance from `@/lib/api`.
 *
 * That is the point of it: `AuthTokenSetter` registers a request interceptor on
 * that one instance which attaches the Clerk JWT, so a bare `fetch` or a second
 * Axios client would silently be unauthenticated and fail the backend's
 * `ClerkAuthGuard`.
 *
 * The read helpers are also called from Server Components. That is safe because
 * `GET /resources` and `GET /tags` are `@Public()`, and the interceptor only
 * ever exists in the browser bundle.
 */

export interface ListResourcesParams {
  /** A tag slug, exactly as `GET /tags` returned it. */
  tag?: string;
  /** Opaque cursor from a previous page's `nextCursor`. */
  cursor?: string;
  limit?: number;
}

export async function listResources(
  params: ListResourcesParams = {},
): Promise<PaginatedResources> {
  const response = await api.get<PaginatedResources>("/resources", {
    // Send nothing rather than `undefined`, so axios leaves absent params out
    // of the query string entirely.
    params: {
      ...(params.tag ? { tag: params.tag } : {}),
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
    },
  });

  return response.data;
}

export async function getResource(
  id: string,
  /**
   * A Clerk session token. Public reads pass nothing and get the redacted
   * shape; the edit page passes one so the backend can tell it is the owner.
   */
  token?: string,
): Promise<Resource> {
  const response = await api.get<Resource>(
    `/resources/${encodeURIComponent(id)}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );

  return response.data;
}

/** Backs the feed's tag filter. Omit `query` for the most-used tags. */
export async function listTags(query?: string): Promise<TagSearchResult[]> {
  const response = await api.get<TagSearchResult[]>("/tags", {
    params: query ? { query } : undefined,
  });

  return response.data;
}

/**
 * Whether the caller contributed this resource.
 *
 * A separate call because a resource shared anonymously is redacted, so its
 * own response cannot say who wrote it — yet the client still needs to know
 * whether to offer an edit.
 */
export async function isMyResource(id: string): Promise<boolean> {
  const response = await api.get<{ isMine: boolean }>(
    `/resources/${encodeURIComponent(id)}/mine`,
  );

  return response.data.isMine;
}

export async function createResource(input: ResourceInput): Promise<Resource> {
  const response = await api.post<Resource>("/resources", input);

  return response.data;
}
export async function updateResource(
  id: string,
  input: ResourceInput,
): Promise<Resource> {
  const response = await api.patch<Resource>(
    `/resources/${encodeURIComponent(id)}`,
    input,
  );

  return response.data;
}

/**
 * Removes a resource permanently, for everyone.
 *
 * The contributor may do this to their own contribution, and so may an admin.
 * The response is discarded by the caller — it redirects to the feed, which
 * refetches — so the body is only here because the route returns one.
 */
export async function deleteResource(id: string): Promise<Resource> {
  const response = await api.delete<Resource>(
    `/resources/${encodeURIComponent(id)}`,
  );

  return response.data;
}
