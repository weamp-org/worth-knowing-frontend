"use client";

import { MessageSquareReplyIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api-error";
import { type Comment, MAX_COMMENT_LENGTH } from "@/lib/comment-types";
import { createComment, deleteComment, listComments } from "@/lib/comments-api";
import { formatDate } from "@/lib/format";

/**
 * A resource's comment thread.
 *
 * The one client component on the resource page that carries its own list, for the
 * same reason `ResourceFeed` is one: a thread grows while you read it. Posting and
 * removing mutate the list in place and "load more" appends a page — a Server
 * Component that only renders what it fetched can do neither.
 *
 * The first page arrives as props from `getCommentsForViewer`, already carrying
 * `isMine`, so the thread is server-rendered and a reader never sees their own comment
 * flash as somebody else's.
 *
 * Newest first, matching the backend. There are no votes to sort by, which is the
 * whole reason for that — see `docs/comments.md` on the backend.
 */
export function CommentSection({
  resourceId,
  initialPage,
  totalCount,
  canComment,
}: {
  resourceId: string;
  /** The first page, fetched on the server so `isMine` is right on arrival. */
  initialPage: { items: Comment[]; nextCursor: string | null };
  /**
   * The resource's `commentCount`, not `items.length`.
   *
   * Passed in rather than counted locally because the thread is paginated: the list
   * holds one page, so its length would read as the total until somebody loaded more,
   * and then change under them. `commentCount` is the honest number and already came
   * with the resource.
   */
  totalCount: number;
  /**
   * Whether a session exists.
   *
   * Not whether the reader is *allowed* to post — anybody signed in may, on any
   * resource — so this is a plain boolean and the composer is absent rather than
   * disabled when false. A disabled textarea reads as "not permitted" and invites the
   * reader to work out why.
   */
  canComment: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const page = await listComments(resourceId, { cursor: nextCursor });

      setComments((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      setError("Could not load more comments. Try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  /**
   * Adds a posted comment to the top of the list.
   *
   * Newest first, so a new comment goes to the top rather than the bottom: somebody
   * posting into a long thread wants to see what they wrote, and appending would put
   * it off-screen. It does mean the list moves under the reader, which is why the
   * composer sits above the thread.
   *
   * A reply lands here too, at the top rather than beneath the comment it answers —
   * the backend sends replies back in the same chronological stream, and re-sorting
   * them client-side would build a tree the API deliberately does not have.
   */
  function add(comment: Comment) {
    setComments((current) => [comment, ...current]);
  }

  function remove(commentId: string) {
    setComments((current) => current.filter((item) => item.id !== commentId));
  }

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-6">
      <h2
        id="comments-heading"
        className="text-xs font-semibold tracking-widest uppercase text-muted-foreground"
      >
        Discussion
        {totalCount > 0 ? ` (${totalCount})` : ""}
      </h2>

      {canComment ? (
        <CommentComposer
          onPosted={add}
          placeholder="What did you make of it?"
          resourceId={resourceId}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Sign in to add to the discussion.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing here yet. If you have read this and have a thought about it,
          that is what this is for.
        </p>
      ) : (
        <ol className="flex flex-col gap-6">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onDeleted={remove}
              onPosted={add}
              resourceId={resourceId}
            />
          ))}
        </ol>
      )}

      {error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {nextCursor ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading…" : "Load more comments"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/**
 * The textarea and its submit, used for both a new comment and a reply.
 *
 * Above the thread rather than at the bottom, so a post lands where the reader is
 * already looking.
 */
function CommentComposer({
  resourceId,
  onPosted,
  parentId,
  placeholder,
  onCancel,
}: {
  resourceId: string;
  /** Called with the created comment, which is already marked `isMine`. */
  onPosted: (comment: Comment) => void;
  /** Set when this is a reply box, which renders as an inline composer. */
  parentId?: string;
  placeholder: string;
  /** Only a reply box has anything to cancel back to. */
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  const [isPending, setIsPending] = useState(false);

  // On the trimmed value, because the backend rejects a whitespace-only body and a
  // round trip to be told so is worse than not making it.
  const isBlank = body.trim().length === 0;

  async function submit() {
    if (isBlank || isPending) return;

    setIsPending(true);

    try {
      const comment = await createComment(
        resourceId,
        parentId ? { body: body.trim(), parentId } : { body: body.trim() },
      );

      // Cleared rather than kept, so a second comment is a fresh thought rather than
      // the first one again by accident.
      setBody("");
      onPosted(comment);
      onCancel?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not post that comment."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder}
        maxLength={MAX_COMMENT_LENGTH}
        // A reply box appears on click, so it takes focus — otherwise the reader who
        // opened it has to go and find it.
        autoFocus={parentId !== undefined}
        aria-label={parentId ? "Your reply" : "Your comment"}
      />

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={submit} disabled={isPending || isBlank}>
          {isPending ? "Posting…" : parentId ? "Reply" : "Post comment"}
        </Button>

        {onCancel ? (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * One comment: the author, the time, the text, and controls.
 *
 * A reply quotes its parent rather than nesting inside it. The backend caps depth at
 * one level and truncates the quoted text, so the tree a nested view implies does not
 * exist — and a reader skimming wants the words, not a reference to them. This also
 * means a deleted parent leaves a reply in place with its quote gone, rather than
 * taking the reply with it.
 */
function CommentItem({
  comment,
  resourceId,
  onDeleted,
  onPosted,
}: {
  comment: Comment;
  resourceId: string;
  onDeleted: (commentId: string) => void;
  onPosted: (comment: Comment) => void;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function remove() {
    if (isDeleting) return;

    setIsDeleting(true);

    try {
      await deleteComment(resourceId, comment.id);
      onDeleted(comment.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not remove that comment."));
      setIsDeleting(false);
    }
  }

  return (
    <article className="flex flex-col gap-2">
      {comment.parent ? (
        <blockquote className="border-l-2 border-border pl-3 text-sm text-muted-foreground">
          {comment.parent.body}
        </blockquote>
      ) : null}

      <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
        {/* Null author means a deleted account — the text outlives its author. Worded
            as removed rather than anonymous, because the backend keeps the two
            distinct and conflating them would misdescribe what happened. */}
        {comment.author?.name ? (
          comment.author.profilePath ? (
            <a
              href={comment.author.profilePath}
              className="font-medium text-foreground hover:underline"
            >
              {comment.author.name}
            </a>
          ) : (
            <span className="font-medium text-foreground">
              {comment.author.name}
            </span>
          )
        ) : (
          <span className="font-medium text-foreground">Removed</span>
        )}
        <time dateTime={comment.createdAt}>
          {formatDate(comment.createdAt)}
        </time>
      </div>

      {/* `whitespace-pre-wrap` so a paragraph somebody typed survives. Markdown is
          not rendered, matching the backend. */}
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {comment.body}
      </p>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsReplying((current) => !current)}
        >
          <MessageSquareReplyIcon aria-hidden="true" />
          Reply
        </Button>

        {/* The author's own, and only ever the author's: the backend decides `isMine`
            because the response carries no comparable id. An admin's path to remove
            somebody else's comment is deliberately not offered here. */}
        {comment.isMine ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={remove}
            disabled={isDeleting}
          >
            <Trash2Icon aria-hidden="true" />
            {isDeleting ? "Removing…" : "Remove"}
          </Button>
        ) : null}
      </div>

      {isReplying ? (
        <CommentComposer
          resourceId={resourceId}
          parentId={comment.id}
          placeholder="Reply…"
          onPosted={onPosted}
          onCancel={() => setIsReplying(false)}
        />
      ) : null}
    </article>
  );
}
