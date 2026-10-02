"use client";

import { CheckIcon, FlagIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { COMMENT_REASON_LABELS, type CommentReport } from "@/lib/comment-types";
import {
  deleteComment,
  dismissCommentReport,
  listCommentReports,
  undismissCommentReport,
} from "@/lib/comments-api";
import { formatDate } from "@/lib/format";

/**
 * The comment report queue.
 *
 * One row per report, so a comment several people flagged occupies several rows.
 * `reportCount` keeps that readable — one report is a hunch, five is a pattern — and
 * the backend ordered it that way deliberately rather than grouping, because grouping
 * means paging over an aggregate that changes while you page. See `docs/comments.md`
 * on the backend.
 *
 * **No reporter is shown**, because the backend does not send one. Nothing here is
 * shaped to display a name of whoever flagged something.
 *
 * Two actions per row, and the distinction between them is the point:
 *
 * - **Remove** takes the comment off the site.
 * - **Dismiss** closes the reports and leaves it. Without the second one, the only way
 *   to work through the queue is to delete things — which quietly makes removal the
 *   answer to every report, including the ones where removal is wrong. A queue a
 *   moderator cannot clear is a queue they stop trusting.
 *
 * Both drop **every** row for the comment. The backend cascades a deleted comment's
 * reports away, and a dismissal closes all of them at once, so leaving the others
 * would show a moderator entries they can do nothing about.
 */
export function CommentReportQueue({
  initialPage,
}: {
  initialPage: { items: CommentReport[]; nextCursor: string | null };
}) {
  const [reports, setReports] = useState<CommentReport[]>(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
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

  function forget(commentId: string) {
    setReports((current) => current.filter((r) => r.comment.id !== commentId));
  }

  async function dismiss(commentId: string) {
    if (busyId) return;

    setBusyId(commentId);

    try {
      await dismissCommentReport(commentId);
      forget(commentId);

      // Undo rather than a confirmation dialog *before* the action, and the difference
      // matters in both directions:
      //
      // - A dialog costs every moderator an extra click on the *safe* action to guard
      //   against one rare mistake. It would also make dismissal feel as heavy as
      //   removal, and then the path of least resistance is remove-or-do-nothing —
      //   friction on exactly the decision a moderator should be making more often.
      // - A dialog on every moderation action is how people learn to click through
      //   them, including the delete one, which is the only one that genuinely needs
      //   reading. Removing still confirms; dismissing does not.
      //
      // Undo is what actually removes the risk, rather than warning about it.
      toast.success("Reports closed.", {
        action: { label: "Undo", onClick: () => void undoDismiss(commentId) },
      });
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Could not dismiss those reports."),
      );
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Reopens the reports a dismissal just closed.
   *
   * Refetches rather than reinserting rows: this component does not have them any
   * more, and reconstructing them from what it remembers would mean inventing a report
   * if the server disagreed. One request, and the queue is exactly what the server
   * says it is.
   */
  async function undoDismiss(commentId: string) {
    try {
      await undismissCommentReport(commentId);

      const page = await listCommentReports();

      setReports((current) => [...page.items, ...current]);
      toast.success("Reports reopened.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not reopen those reports."));
    }
  }

  async function remove(commentId: string) {
    if (busyId) return;

    setBusyId(commentId);

    try {
      // The delete route is nested under the resource and the queue spans resources,
      // so each row's own `resourceId` is used rather than one off the list.
      const report = reports.find((r) => r.comment.id === commentId);

      if (!report) {
        setBusyId(null);
        return;
      }

      await deleteComment(report.comment.resourceId, commentId);
      forget(commentId);
      toast.success("Comment removed.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not remove that comment."));
      setBusyId(null);
    }
  }

  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">None.</p>;
  }

  return (
    <div>
      <ul className="flex flex-col divide-y divide-border">
        {reports.map((report) => {
          const commentId = report.comment.id;
          const isBusy = busyId === commentId;

          return (
            <li key={report.id} className="flex flex-col gap-3 py-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge
                  variant={report.reportCount > 1 ? "secondary" : "outline"}
                >
                  {report.reportCount}{" "}
                  {report.reportCount === 1 ? "report" : "reports"}
                </Badge>

                {/* Null author means a deleted account — the comment outlives its
                    author. Worded as removed rather than anonymous, because the backend
                    keeps the two distinct. */}
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

              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {report.comment.body}
              </p>

              {/* The category as a badge, on every row identically. It is the part a
                  moderator groups by, and showing it the same way every time is what
                  makes the queue scannable. */}
              <div className="flex flex-wrap items-start gap-2">
                <Badge variant="secondary">
                  {COMMENT_REASON_LABELS[report.reason]}
                </Badge>

                {report.detail ? (
                  <p className="text-sm text-muted-foreground">
                    {report.detail}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Removal is permanent and takes the comment with it, so it asks —
                    the same treatment it gets on the thread itself. */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId !== null}
                    >
                      <FlagIcon aria-hidden="true" />
                      Remove comment
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove this comment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        It will be removed for everyone, and this cannot be
                        undone.
                        <br />
                        <br />
                        Replies to it are kept and simply lose the quote above
                        them. If there is nothing wrong with it, close the
                        reports instead.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isBusy}>
                        Keep it
                      </AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        disabled={isBusy}
                        onClick={(event) => {
                          // Radix closes on press; suppressing keeps the dialog open
                          // for the length of the request so a failure is retryable.
                          event.preventDefault();
                          void remove(commentId);
                        }}
                      >
                        {isBusy ? "Removing…" : "Remove for everyone"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/*
                  Dismiss is the *non-destructive* outcome, so it leads here rather
                  than trailing after Remove: it is the answer most reports actually
                  want, and putting it last would make "delete it" the default read of
                  the row.
                */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => dismiss(commentId)}
                  disabled={busyId !== null}
                >
                  <CheckIcon aria-hidden="true" />
                  {isBusy ? "Closing…" : "Keep, close reports"}
                </Button>

                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/resources/${report.comment.resourceId}`}>
                    View thread
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
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
