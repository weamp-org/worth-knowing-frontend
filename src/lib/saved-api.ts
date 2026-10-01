import api from "@/lib/api";
import type { PaginatedResources } from "@/lib/resource-types";

/**
 * Bookmark reads and writes.
 *
 * Every call goes through the shared `api` instance, for the reason
 * `resources-api.ts` documents: `AuthTokenSetter` installs the Clerk JWT
 * interceptor on that one instance, so anything else would be unauthenticated.
 *
 * Every route here is authenticated — there is no public version of somebody's
 * saved list — so a Server Component must attach the token itself. See
 * `getSavedStateForViewer`.
 */

/**
 * Your saved resources, newest saved first.
 *
 * Newest *saved*, not newest shared. For a two-year-old contribution you saved
 * yesterday, the resource's own date would put this list in the wrong order.
 *
 * A token is required from a Server Component; the browser gets it from the
 * interceptor.
 */
export async function listSaved(options: { token?: string } = {}) {
  const response = await api.get<PaginatedResources>("/saved", {
    ...(options.token
      ? { headers: { Authorization: `Bearer ${options.token}` } }
      : {}),
  });

  return response.data;
}

/**
 * Whether the caller saved this resource.
 *
 * Separate from the resource itself because it is the one per-viewer part:
 * `savedCount` is public and travels on every resource, this is not.
 */
export async function isSaved(
  resourceId: string,
  token?: string,
): Promise<boolean> {
  const response = await api.get<{ isSaved: boolean }>(
    `/saved/${encodeURIComponent(resourceId)}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );

  return response.data.isSaved;
}

/**
 * Saves a resource.
 *
 * Idempotent — saving one twice succeeds and changes nothing — so this can be
 * fired without first checking. The response is the resource, because the
 * caller wants the refreshed `savedCount` to render and that lives there.
 */
export async function saveResource(
  resourceId: string,
): Promise<PaginatedResources["items"][number]> {
  const response = await api.post<PaginatedResources["items"][number]>(
    "/saved",
    { resourceId },
  );

  return response.data;
}

/** Removes a bookmark. Idempotent for the same reason. */
export async function unsaveResource(
  resourceId: string,
): Promise<PaginatedResources["items"][number]> {
  const response = await api.delete<PaginatedResources["items"][number]>(
    `/saved/${encodeURIComponent(resourceId)}`,
  );

  return response.data;
}
