import {
  ACCESS_TYPES,
  type AccessType,
  RESOURCE_SORTS,
  RESOURCE_TYPES,
  type ResourceSort,
  type ResourceType,
} from "@/lib/resource-types";

/**
 * Everything `/browse` reads off the URL.
 *
 * Kept as one shape because four places now build or consume these parameters —
 * the search box, the filter controls, the tag nav and the page itself — and a
 * parameter list invented separately in each of them is one that will drift.
 */
export interface BrowseParams {
  q?: string;
  tag?: string;
  type?: ResourceType;
  accessType?: AccessType;
  sort?: ResourceSort;
}

/**
 * Builds a `/browse` URL from a partial set of filters.
 *
 * Absent, empty and whitespace-only values are all dropped rather than sent as
 * `?q=`. That matters more than it looks: a bare `?q=` in the address bar would
 * otherwise be a link that reads as a search and renders the whole site, and
 * these URLs get copied around.
 *
 * Order is fixed rather than the caller's, so two links built from the same state
 * are the same string — otherwise the browser treats a reordered query as a new
 * history entry and the back button starts feeling unreliable.
 */
export function browseHref(params: BrowseParams): string {
  const search = new URLSearchParams();

  const query = params.q?.trim();
  if (query) search.set("q", query);
  if (params.tag) search.set("tag", params.tag);
  if (params.type) search.set("type", params.type);
  if (params.accessType) search.set("accessType", params.accessType);
  if (params.sort) search.set("sort", params.sort);

  const qs = search.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

/**
 * Narrows an untrusted query string to the values the backend accepts.
 *
 * `searchParams` is whatever the URL contained, so `?type=BANANA` reaches the
 * page. Forwarding it unchanged would turn a hand-edited or stale link into a 400
 * and an error page; dropping it turns the same link into an unfiltered browse,
 * which is what somebody following an outdated link actually wants.
 *
 * Checked here rather than left to the backend's `ValidationPipe` because a 400
 * is a worse outcome than an ignored parameter, and because the controls have to
 * know which value to show as selected either way.
 */
export function parseBrowseParams(
  searchParams: Record<string, string | string[] | undefined>,
): BrowseParams {
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const type = one(searchParams.type);
  const accessType = one(searchParams.accessType);
  const sort = one(searchParams.sort);
  const tag = one(searchParams.tag);
  const q = one(searchParams.q)?.trim();

  return {
    ...(q ? { q } : {}),
    ...(tag ? { tag } : {}),
    ...(RESOURCE_TYPES.includes(type as ResourceType)
      ? { type: type as ResourceType }
      : {}),
    ...(ACCESS_TYPES.includes(accessType as AccessType)
      ? { accessType: accessType as AccessType }
      : {}),
    ...(RESOURCE_SORTS.includes(sort as ResourceSort)
      ? { sort: sort as ResourceSort }
      : {}),
  };
}
