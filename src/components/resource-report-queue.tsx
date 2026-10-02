"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import type { ResourceReport } from "@/lib/comment-types";
import { formatDate, getHostname } from "@/lib/format";
import { deleteResource, listResourceReports } from "@/lib/resources-api";

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
 * shaped to display a name of whoever flagged something.
 *
 * Removal reuses the ordinary `DELETE /resources/:id`, which an admin could already
 * call. What this page adds is the queue saying where to look.
 */
export function ResourceReportQueue({
  initialPage,
}: {
  initialPage: { items: ResourceReport[]; nextCursor: string | null };
}) {
  const [reports, setReports] = useState<ResourceReport[]>(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
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

  /**
   * Removes a contribution and drops every row that pointed at it.
   *
   * Every row, not just this one: the backend cascades a deleted resource's reports
   * away, so leaving the others would show a moderator entries they can do nothing
   * about.
   */
  async function remove(resourceId: string) {
    if (removingId) return;

    setRemovingId(resourceId);

    try {
      await deleteResource(resourceId);

      setReports((current) =>
        current.filter((report) => report.resource.id !== resourceId),
      );
      toast.success("Contribution removed.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not remove that resource."));
    } finally {
      setRemovingId(null);
    }
  }

  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">None.</p>;
  }

  return (
    <div>
      <ul className="flex flex-col divide-y divide-border">
        {reports.map((report) => (
          <li key={report.id} className="flex flex-col gap-3 py-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {/* The number a moderator reads first: how many people thought this was
                  worth flagging. */}
              <Badge variant={report.reportCount > 1 ? "secondary" : "outline"}>
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

              <time dateTime={report.createdAt}>
                reported {formatDate(report.createdAt)}
              </time>
            </div>

            <div className="flex flex-col gap-1">
              {/* The title and host, because a moderator judging a link needs to know
                  where it goes before they open it. */}
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
                onClick={() => remove(report.resource.id)}
                disabled={removingId !== null}
              >
                {removingId === report.resource.id
                  ? "Removing…"
                  : "Remove contribution"}
              </Button>

              {/* The page it was on, with its discussion. A report without context is
                  a title and a date. */}
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/resources/${report.resource.id}`}>View page</Link>
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
