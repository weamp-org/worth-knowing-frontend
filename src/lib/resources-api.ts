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

export async function getResource(id: string): Promise<Resource> {
  const response = await api.get<Resource>(
    `/resources/${encodeURIComponent(id)}`,
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
