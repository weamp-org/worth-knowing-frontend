"use client";

import { CheckIcon } from "lucide-react";
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
import {
  RESOURCE_REASON_LABELS,
  type ResourceReport,
} from "@/lib/comment-types";
import { formatDateTime, getHostname } from "@/lib/format";
import {
  deleteResource,
  dismissResourceReport,
  listResourceReports,
  undismissResourceReport,
} from "@/lib/resources-api";

/**
 * The resource report queue: contributions people have flagged.
 *
 * One row per report, so a contribution several people flagged occupies several rows.
 * `reportCount` keeps that readable — one report is a hunch, five is a pattern — and
 * the backend ordered it that way deliberately rather than grouping, because grouping
 * means paging over an aggregate that changes while you page. See `docs/comments.md`
 * on the backend.
 *
 * **No reporter is shown**, because the backend does not send one. Nothing here is
 * shaped to display a name of whoever flagged something, and an anonymously shared
 * contribution stays redacted — see the byline below.
 *
 * Two actions per row, and the distinction is the point:
 *
 * - **Remove** takes the contribution off the site for everyone.
 * - **Keep it, close the reports** closes the reports and leaves it.
 *
 * The second one matters more here than for comments. `BROKEN_LINK` and
 * `WRONG_RESOURCE` are usually a fix rather than a deletion, and a carefully written
 * `why` for a link that has since died is worth repairing rather than throwing away.
 * Without a non-destructive action the queue can only be cleared by deleting.
 */
export function ResourceReportQueue({
  initialPage,
}: {
  initialPage: { items: ResourceReport[]; nextCursor: string | null };
}) {
  const [reports, setReports] = useState<ResourceReport[]>(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const page = await listResourceReports({ cursor: nextCursor });

      setReports((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      setError("Could not load more reports. Try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  function forget(resourceId: string) {
    setReports((current) =>
      current.filter((r) => r.resource.id !== resourceId),
    );
  }

  async function dismiss(resourceId: string) {
    if (busyId) return;

    setBusyId(resourceId);

    try {
      await dismissResourceReport(resourceId);
      forget(resourceId);

      // Undo rather than a confirmation dialog *before* the action. Dismissing deletes
      // nothing — the contribution and the report rows both stay — so this is the
      // reversible action and the dialog belongs on Remove.
      //
      // Asking here would also make dismissal feel as heavy as removal, and then the
      // path of least resistance is remove-or-do-nothing: friction on exactly the
      // decision a moderator should be making more often. And a dialog on every
      // moderation action is how people learn to click through them, including the
      // one that genuinely needs reading.
      toast.success("Reports closed.", {
        action: { label: "Undo", onClick: () => void undoDismiss(resourceId) },
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not close those reports."));
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Reopens the reports a dismissal just closed.
   *
   * Refetches rather than reinserting rows: this component does not have them any
   * more, and reconstructing them from what it remembers would mean inventing a report
   * if the server disagreed.
   */
  async function undoDismiss(resourceId: string) {
    try {
      await undismissResourceReport(resourceId);

      const page = await listResourceReports();

      setReports((current) => [...page.items, ...current]);
      toast.success("Reports reopened.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not reopen those reports."));
    }
  }

  async function remove(resourceId: string) {
    if (busyId) return;

    setBusyId(resourceId);

    try {
      await deleteResource(resourceId);
      forget(resourceId);
      toast.success("Contribution removed.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not remove that resource."));
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
          const resourceId = report.resource.id;
          const isBusy = busyId === resourceId;

          return (
            <li key={report.id} className="flex flex-col gap-3 py-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {/* The number a moderator reads first: how many people thought this was
                    worth flagging. */}
                <Badge
                  variant={report.reportCount > 1 ? "secondary" : "outline"}
                >
                  {report.reportCount}{" "}
                  {report.reportCount === 1 ? "report" : "reports"}
                </Badge>

                <span className="font-medium text-foreground">
                  {/* Anonymity survives into this queue. The backend redacts it, and a
                      moderator does not need a name to decide a link is spam. */}
                  {report.resource.contributor?.name ??
                    (report.resource.isAnonymous
                      ? "Shared anonymously"
                      : "Removed")}
                </span>

                {/* With a time, because recency is the question this queue exists to
                    answer: an hour-old report and a week-old one are different
                    amounts of work. */}
                <time dateTime={report.createdAt}>
                  reported {formatDateTime(report.createdAt)}
                </time>
              </div>

              <div className="flex flex-col gap-1">
                {/* The title and host, because judging a link means knowing where it
                    goes before opening it. */}
                <a
                  href={report.resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                >
                  {report.resource.title}
                </a>
                <span className="text-xs text-muted-foreground">
                  {getHostname(report.resource.url)}
                </span>
              </div>

              {/* The `why` in full. A moderator is judging the reasoning as much as the
                  link, and there is nothing below it to bury. */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {report.resource.why}
              </p>

              {/* The category as a badge, on every row identically. That is the whole
                  reason it is required: it is the part a moderator groups by, and it is
                  what lets a row be triaged without reading the detail underneath. */}
              <div className="flex flex-wrap items-start gap-2">
                <Badge variant="secondary">
                  {RESOURCE_REASON_LABELS[report.reason]}
                </Badge>

                {report.detail ? (
                  <p className="text-sm text-muted-foreground">
                    {report.detail}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Removal is permanent for everybody and takes the `why` with it, so
                    it asks — the same treatment a contributor's own delete gets on
                    the resource page. */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId !== null}
                    >
                      Remove contribution
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Remove this contribution?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        <span className="font-medium text-foreground">
                          {report.resource.title}
                        </span>{" "}
                        and the explanation behind it will be removed for
                        everyone. This cannot be undone.
                        <br />
                        <br />
                        If the only problem is the link, close the reports
                        instead and keep it.
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
                          void remove(resourceId);
                        }}
                      >
                        {isBusy ? "Removing…" : "Remove for everyone"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* The non-destructive outcome, and the answer most reports actually
                    want — especially BROKEN_LINK, which is usually a fix. */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => dismiss(resourceId)}
                  disabled={busyId !== null}
                >
                  <CheckIcon aria-hidden="true" />
                  {isBusy ? "Closing…" : "Keep it, close reports"}
                </Button>

                {/* The page it was on, with its discussion. A report without context is
                    a title and a date. */}
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/resources/${resourceId}`}>View page</Link>
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
