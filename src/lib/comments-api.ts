import api from "@/lib/api";
import type {
  Comment,
  CommentInput,
  CommentReportReason,
  PaginatedCommentReports,
  PaginatedComments,
} from "@/lib/comment-types";

/**
 * Comment reads and writes.
 *
 * Every call goes through the shared `api` instance, for the reason
 * `resources-api.ts` documents: `AuthTokenSetter` installs the Clerk JWT interceptor
 * on that one instance, so anything else would be unauthenticated.
 *
 * The listing is `@Public()` on the backend — discussion is part of the public surface
 * of a resource — so a Server Component can read it with no token. Writes always need
 * one, and a Server Component would have to attach it itself; the resource page does
 * its posting from the client, where the interceptor already is.
 */

/** The path for one resource's thread. */
function thread(resourceId: string) {
  return `/resources/${encodeURIComponent(resourceId)}/comments`;
}

export interface ListCommentsParams {
  /** Opaque cursor from a previous page's `nextCursor`. */
  cursor?: string;
  limit?: number;
}

/**
 * A resource's comments, newest first.
 *
 * A Clerk session token is accepted so the backend can mark each comment `isMine`.
 * Without one every comment reads as not yours, which is a default rather than a
 * fact — so a Server Component that will render a delete control should pass the
 * token rather than let the caller offer controls it cannot justify.
 */
export async function listComments(
  resourceId: string,
  params: ListCommentsParams = {},
  token?: string,
): Promise<PaginatedComments> {
  const response = await api.get<PaginatedComments>(thread(resourceId), {
    // Send nothing rather than `undefined`, so axios leaves absent params out of
    // the query string entirely.
    params: {
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
    },
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });

  return response.data;
}

/**
 * Posts a comment, or a reply.
 *
 * Returns the created comment rather than nothing, so the caller can append it to
 * the thread without refetching the page. `isMine` is already true on it, since the
 * backend knows the session.
 *
 * `parentId` omitted posts a top-level comment. A reply to a reply is accepted and
 * flattened onto the grandparent by the backend, so depth never exceeds one level
 * however this is called.
 */
export async function createComment(
  resourceId: string,
  input: CommentInput,
): Promise<Comment> {
  const response = await api.post<Comment>(thread(resourceId), {
    body: input.body,
    ...(input.parentId ? { parentId: input.parentId } : {}),
  });

  return response.data;
}

/**
 * Flags a comment for the moderators.
 *
 * `reason` is required — it is what makes a moderator's queue sortable — and `detail`
 * is optional free text.
 *
 * Idempotent, so it can be fired without checking first. `204` with no body, and
 * **nothing changes for any reader** — the reported comment looks exactly as it did.
 * That is why there is no optimistic state: the only honest thing to render afterwards
 * is the same comment that was already there.
 *
 * The backend refuses a report on your own comment, so a client should not offer the
 * control on one.
 */
export async function reportComment(
  resourceId: string,
  commentId: string,
  reason: CommentReportReason,
  detail?: string,
): Promise<void> {
  await api.post(
    `${thread(resourceId)}/${encodeURIComponent(commentId)}/report`,
    // Detail omitted rather than sent empty, so the backend stores no detail rather
    // than an empty string. The category is required and always sent.
    detail ? { reason, detail } : { reason },
  );
}

/**
 * The comment moderation queue. Admin only — the backend refuses anybody else with a
 * 403.
 *
 * One row per report rather than per reported comment, so a comment several people
 * flagged occupies several rows here. `reportCount` on each row is what makes that
 * readable at a glance. See `docs/comments.md` on the backend for why it is not
 * grouped.
 *
 * **No reporter is ever returned.** The backend does not select one, and there is no
 * field here to look for.
 */
export async function listCommentReports(
  params: ListCommentsParams = {},
  token?: string,
): Promise<PaginatedCommentReports> {
  const response = await api.get<PaginatedCommentReports>("/comment-reports", {
    params: {
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
    },
    // A Server Component has no interceptor, so it attaches the token itself. See
    // `getCommentsForViewer`, which does the same for the thread.
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });

  return response.data;
}

/**
 * Removes a comment. Author or admin only.
 *
 * `204` with no body, so there is nothing to return. Callers drop the row locally.
 */
export async function deleteComment(
  resourceId: string,
  commentId: string,
): Promise<void> {
  await api.delete(`${thread(resourceId)}/${encodeURIComponent(commentId)}`);
}
