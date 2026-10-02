/**
 * Types mirroring the backend's comment API.
 *
 * Hand-maintained like `resource-types.ts` — the two packages are independently
 * versioned with no shared types package between them. This tracks:
 *
 *   - `worth-knowing-backend/src/comments/dtos/comment-response.dto.ts`
 *   - `worth-knowing-backend/src/comments/dtos/create-comment.dto.ts`
 *   - `worth-knowing-backend/src/resources/dtos/resource-response.dto.ts` (`ResourceReport`)
 *
 * Dates are strings, not `Date`: everything here has crossed a JSON boundary.
 */

import type { Resource } from "@/lib/resource-types";

/** The backend's own bound, restated so the form can reject input before a round trip. */
export const MAX_COMMENT_LENGTH = 2000;

/**
 * The author of a comment.
 *
 * There are no anonymity semantics here, unlike on a resource — a comment is
 * attributed for as long as the author exists.
 */
export interface CommentAuthor {
  /**
   * The Clerk user ID. Present because the backend needs to decide `isMine`, but a
   * client should render against `isMine` rather than comparing this itself.
   */
  id: string;
  /**
   * The Clerk name, or failing that the handle claimed here. Resolved server-side and
   * never a placeholder. Null only when the author has no name at all.
   */
  name: string | null;
  imageUrl: string | null;
  /**
   * Where to link this name, resolved by the server. Null when there is nowhere to
   * go — a private profile, or no handle claimed. Render an anchor when this is a
   * string, plain text when it is null.
   */
  profilePath: string | null;
}

/**
 * The comment a reply answers, quoted above it.
 *
 * The backend truncates `body` to 160 characters with an ellipsis, and deliberately
 * does not send this comment's own `parentId` — there is no tree to recurse into.
 */
export interface CommentParent {
  id: string;
  /** Truncated for the quote. The full text is on the parent's own row. */
  body: string;
}

export interface Comment {
  id: string;
  resourceId: string;
  /** Trimmed, and never blank — the backend rejects a whitespace-only body. */
  body: string;
  createdAt: string;
  /**
   * Who said it. Null only when the author's account has been deleted: a comment
   * outlives its author, so the text stays and reads as *removed*, which is a
   * different thing from anonymous.
   */
  author: CommentAuthor | null;
  /** The comment this replies to, or null if it is a top-level comment. */
  parent: CommentParent | null;
  /**
   * Whether the signed-in caller wrote this comment. Server-decided, because the
   * response carries no comparable author id. Drives whether a delete control is
   * offered at all.
   */
  isMine: boolean;
}

export interface PaginatedComments {
  items: Comment[];
  nextCursor: string | null;
}

/**
 * The `POST .../comments` body.
 *
 * `parentId` is optional; omitting it posts a top-level comment. The backend caps
 * depth at one level by re-pointing a reply-to-a-reply at the grandparent.
 */
export interface CommentInput {
  body: string;
  parentId?: string;
}

/**
 * The backend's bound on a report's reason, restated for the form.
 *
 * Shared by both report kinds — a contribution and a comment — because the two DTOs
 * carry the same limit for the same reason: a report is a complaint, not a second
 * contribution.
 */
export const MAX_REPORT_REASON_LENGTH = 500;

/** One row of the admin moderation queue, from `GET /comment-reports`. */
export interface CommentReport {
  /** The composite key `commentId:reporterId`. Carries no meaning to read. */
  id: string;
  /**
   * The reported comment, in the public thread's own shape — `isMine` is always
   * false here, because a moderator is looking at somebody else's comment.
   */
  comment: Comment;
  /**
   * How many people reported it. One report is a hunch, five is a pattern, and a
   * moderator should not have to open every row to tell which is which.
   */
  reportCount: number;
  /** Empty string when the reporter gave no reason. */
  reason: string;
  createdAt: string;
}

export interface PaginatedCommentReports {
  items: CommentReport[];
  nextCursor: string | null;
}

/**
 * One row of the resource moderation queue, from `GET /resource-reports`.
 *
 * The same shape as a {@link CommentReport} against a resource, for the same reason:
 * one row per report rather than per reported thing, because grouping means paging
 * over an aggregate that changes while you page.
 */
export interface ResourceReport {
  /** The composite key `resourceId:reporterId`. Carries no meaning to read. */
  id: string;
  /**
   * The reported resource, in its ordinary public shape.
   *
   * `contributor` is null here when the contribution was shared anonymously — not
   * because it was deleted, which `isAnonymous` tells apart. The backend redacts it
   * on purpose: a moderator does not get to un-withhold a name.
   */
  resource: Resource;
  reportCount: number;
  reason: string;
  createdAt: string;
}

export interface PaginatedResourceReports {
  items: ResourceReport[];
  nextCursor: string | null;
}
