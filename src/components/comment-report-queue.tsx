"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import type { CommentReport } from "@/lib/comment-types";
import { deleteComment, listCommentReports } from "@/lib/comments-api";
import { formatDate } from "@/lib/format";

/**
 * The moderation queue: comments people have reported.
 *
 * One row per report, not per reported comment, so a comment several people flagged
 * occupies several rows. `reportCount` is what keeps that readable — one report is a
 * hunch, five is a pattern — and the backend ordered it that way deliberately rather
 * than grouping, because grouping means paging over an aggregate that changes while
 * you page. See `docs/comments.md` on the backend.
 *
 * **No reporter is shown**, because the backend does not send one. Nothing here is
 * shaped to display a name of whoever flagged something.
 *
 * Removing uses the same `DELETE .../comments/:id` a comment's author uses. An admin
 * removing somebody else's comment is the moderation path, and it was always there;
 * what this page adds is the queue telling an admin where to look.
 */
export function CommentReportQueue({
  initialPage,
}: {
  initialPage: { items: CommentReport[]; nextCursor: string | null };
}) {
  const [reports, setReports] = useState<CommentReport[]>(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const page = await listCommentReports({ cursor: nextCursor });

      setReports((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      setError("Could not load more reports. Try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  /**
   * Removes a comment and drops every row that pointed at it.
   *
   * Takes the whole row rather than a bare id, because the delete route is nested
   * under the resource and **the queue spans resources** — it is not one thread, so
   * there is no single `resourceId` to take from the first row.
   *
   * Drops every row, not just this one: a comment five people reported is five rows
   * here, and after a removal the other four refer to something that no longer
   * exists — the backend cascades its reports away, so leaving them would show a
   * moderator four rows they can do nothing about.
   */
  async function remove(report: CommentReport) {
    if (removingId) return;

    setRemovingId(report.comment.id);

    try {
      await deleteComment(report.comment.resourceId, report.comment.id);

      setReports((current) =>
        current.filter((item) => item.comment.id !== report.comment.id),
      );
      toast.success("Comment removed.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not remove that comment."));
    } finally {
      setRemovingId(null);
    }
  }

  if (reports.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing has been reported.
      </p>
    );
  }

  return (
    <div>
      <ul className="flex flex-col divide-y divide-border">
        {reports.map((report) => (
          <li key={report.id} className="flex flex-col gap-3 py-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {/* The one number a moderator reads first: how many people thought this
                  was worth flagging. */}
              <Badge variant={report.reportCount > 1 ? "secondary" : "outline"}>
                {report.reportCount}{" "}
                {report.reportCount === 1 ? "report" : "reports"}
              </Badge>

              <span className="font-medium text-foreground">
                {report.comment.author?.name ?? "Removed"}
              </span>

              <time dateTime={report.comment.createdAt}>
                {formatDate(report.comment.createdAt)}
              </time>

              <time dateTime={report.createdAt}>
                reported {formatDate(report.createdAt)}
              </time>
            </div>

            {/* The comment's own text, in full. A moderator has to read the thing
                before deciding about it, so this is not truncated the way a parent
                quote is in the thread. */}
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {report.comment.body}
            </p>

            {/* A report with no reason is common and not suspicious — the reason is
                optional on purpose, so an empty one is shown as its absence rather
                than hidden. */}
            {report.reason ? (
              <p className="border-l-2 border-border pl-3 text-sm text-muted-foreground">
                {report.reason}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No reason given.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => remove(report)}
                disabled={removingId !== null}
              >
                {removingId === report.comment.id
                  ? "Removing…"
                  : "Remove comment"}
              </Button>

              {/* The thread it was on, because a report without its context is a
                  comment and a date. */}
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/resources/${report.comment.resourceId}`}>
                  View thread
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="py-6 text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {nextCursor ? (
        <div className="flex justify-center py-10">
          <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
