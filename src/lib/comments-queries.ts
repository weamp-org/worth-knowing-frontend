import { auth } from "@clerk/nextjs/server";
import { cache } from "react";
import type { PaginatedComments } from "@/lib/comment-types";
import { listComments } from "@/lib/comments-api";

/**
 * Server-side reads for a resource's comment thread.
 *
 * The listing is `@Public()` on the backend, so this works signed out — but the
 * token is passed anyway when there is a session, because `isMine` is per-viewer and
 * is what decides whether a delete control is offered. Omitting it would mark every
 * comment as not the reader's, which for the person who just posted is a fact rather
 * than a default.
 *
 * `cache` dedupes within a single render pass, so a page that wants the thread in
 * both `generateMetadata` and its body fetches it once. It does not survive a
 * request, which is right: `isMine` is a per-viewer answer.
 */

/**
 * A resource's first page of comments, newest first.
 *
 * SSR'd on purpose, for the same reason `SaveButton` takes its initial state as a
 * prop: a thread that renders empty and then fills in is worse than one that is
 * simply short. A client fetch would leave the section blank until it resolved.
 */
export const getCachedComments = cache(
  async (
    resourceId: string,
    viewerToken?: string,
  ): Promise<PaginatedComments> => {
    return listComments(resourceId, {}, viewerToken);
  },
);

/**
 * The same read with the session token attached.
 *
 * Separate from {@link getCachedComments} rather than a parameter on it so a caller
 * cannot accidentally pass `undefined` and get the signed-out shape without noticing
 * — the token is the whole difference between the two.
 */
export async function getCommentsForViewer(
  resourceId: string,
): Promise<PaginatedComments> {
  const { getToken } = await auth();

  return getCachedComments(resourceId, (await getToken()) ?? undefined);
}
