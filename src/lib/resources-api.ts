import api from "@/lib/api";
import type {
  PaginatedResourceReports,
  ResourceReportReason,
} from "@/lib/comment-types";
import type {
  AccessType,
  PaginatedResources,
  Resource,
  ResourceInput,
  ResourceSort,
  ResourceType,
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
  /**
   * One contributor's resources, by their handle.
   *
   * Combines with `tag` rather than replacing it — a profile's listing uses this
   * alone, the feed uses `tag` alone, and the backend ANDs whatever it is sent.
   */
  contributor?: string;
  /** Opaque cursor from a previous page's `nextCursor`. */
  cursor?: string;
  /**
   * Asks the response for a smaller page, to drive a suggestion list rather than a
   * feed.
   *
   * The payload is the whole resource — contributor join, tags, the `why` — so this
   * is the knob that decides how much a keystroke costs. The ranked endpoint is
   * reused rather than a lighter `/suggest` route added, which is what buys the
   * anonymity redaction for free; the cost is that this is heavier than a
   * suggestion list strictly needs. Drop it if typeahead payloads ever show up as a
   * problem.
   */
  limit?: number;
  /**
   * Free text, matched against titles, tag names and `why`.
   *
   * **The cursor changes meaning with this.** Ranking is `(score, id)` rather
   * than `(createdAt, id)`, so a `nextCursor` from a search is only valid for
   * another search, and one from the feed is not valid here. Callers that page
   * must pass `q` on every request or page two is the unfiltered feed.
   */
  q?: string;
  type?: ResourceType;
  accessType?: AccessType;
  /**
   * Omit it for newest first — or for relevance when `q` is present.
   *
   * Relevance is the **absence** of `sort`, not a value, so `q` plus `sort` is a
   * meaningful combination rather than a contradiction: every match, in that
   * order. There is deliberately no `sort=relevance`; the backend would have no
   * way to honour it without a `q` to be relevant to.
   */
  sort?: ResourceSort;
}

export async function listResources(
  params: ListResourcesParams = {},
  /**
   * An `AbortSignal`, passed through to axios.
   *
   * For the search typeahead, which fires a request per settled query: by the time
   * the fourth one is in flight the first three are already stale, and aborting
   * them frees the connection rather than leaving them to compete for it and
   * arrive out of order. Optional, so every other caller is unaffected.
   */
  signal?: AbortSignal,
): Promise<PaginatedResources> {
  const response = await api.get<PaginatedResources>("/resources", {
    ...(signal ? { signal } : {}),
    // Send nothing rather than `undefined`, so axios leaves absent params out
    // of the query string entirely. `q` is included in that rule: an empty
    // `q` is omitted, which is what makes clearing the box mean "stop searching"
    // rather than "search for nothing" — the same answer the backend gives.
    params: {
      ...(params.tag ? { tag: params.tag } : {}),
      ...(params.contributor ? { contributor: params.contributor } : {}),
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
      ...(params.q ? { q: params.q } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.accessType ? { accessType: params.accessType } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
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

/**
 * Flags a contribution for the moderators.
 *
 * The higher-leverage of the two report kinds, and the one that existed first in
 * spirit: a bad link gets shared onward to people who never saw the flag, where a bad
 * comment stays under one page.
 *
 * `reason` is required — it is what makes a moderator's queue sortable — and `detail`
 * is optional free text.
 *
 * `204` with no body, and nothing changes for any reader — including the contributor.
 * The backend refuses a report on your own contribution, so a client should not offer
 * the control on one.
 */
export async function reportResource(
  id: string,
  reason: ResourceReportReason,
  detail?: string,
): Promise<void> {
  await api.post(`/resources/${encodeURIComponent(id)}/report`, {
    reason,
    // Omitted rather than sent empty, so the backend stores no detail rather than an
    // empty string.
    ...(detail ? { detail } : {}),
  });
}

/**
 * Dismisses every report on a contribution, without removing it.
 *
 * "I looked at this and it stays". Worth having as its own action because a
 * `BROKEN_LINK` report on a carefully written `why` is often a fix rather than a
 * deletion, and without this the only way to close a report out was to delete the
 * thing — which makes removal the answer to every report.
 *
 * Idempotent and `204`. Takes the **resource** id, not a report id, for the same
 * reason as the comment queue: one decision closes all the rows.
 */
export async function dismissResourceReport(resourceId: string): Promise<void> {
  await api.post(`/resource-reports/${encodeURIComponent(resourceId)}/dismiss`);
}

/**
 * Reopens every dismissed report on a contribution.
 *
 * The other half of {@link dismissResourceReport}, and the reason that one needs no
 * confirmation dialog: without a way back, a mis-click would be permanent in practice.
 *
 * Offered by the client as an **Undo on the toast** rather than as a dialog asking
 * first.
 */
export async function undismissResourceReport(
  resourceId: string,
): Promise<void> {
  await api.post(
    `/resource-reports/${encodeURIComponent(resourceId)}/undismiss`,
  );
}

/**
 * The resource moderation queue. Admin only — the backend refuses anybody else with
 * a 403, which `getResourceReportsForViewer` turns into rendered output.
 *
 * One row per report rather than per reported contribution, for the same reason the
 * comment queue is: grouping means ordering by an aggregate that changes while you
 * page. `reportCount` rides along so the queue is triageable at a glance.
 *
 * **No reporter is ever returned**, and an anonymously shared contribution is still
 * redacted in the response — the backend routes it through the ordinary public read.
 *
 * Lives here rather than in `comments-api.ts` because it is a resource endpoint, and
 * the two queues' response types should not sit in the same file where they can be
 * confused for each other.
 */
export async function listResourceReports(
  params: { cursor?: string; limit?: number } = {},
  token?: string,
): Promise<PaginatedResourceReports> {
  const response = await api.get<PaginatedResourceReports>(
    "/resource-reports",
    {
      params: {
        ...(params.cursor ? { cursor: params.cursor } : {}),
        ...(params.limit ? { limit: params.limit } : {}),
      },
      // A Server Component has no interceptor, so it attaches the token itself.
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    },
  );

  return response.data;
}
