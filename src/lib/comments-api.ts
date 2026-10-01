import api from "@/lib/api";
import type {
  Comment,
  CommentInput,
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
