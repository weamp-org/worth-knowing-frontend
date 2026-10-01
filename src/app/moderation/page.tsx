import type { Metadata } from "next";

import { CommentReportQueue } from "@/components/comment-report-queue";
import { getCommentReportsForViewer } from "@/lib/comments-queries";

/**
 * The moderation queue: comments people have reported.
 *
 * Admin only, enforced by the backend. There is no role to check on the way in —
 * nothing in the API exposes the caller's own role — so the page asks the queue and
 * renders what it is told. A 403 becomes a plain "no access" answer rather than a
 * throw, because "you are not an admin" is a state to render and not a fault: the
 * error boundary would otherwise tell a signed-in reader their session had broken.
 *
 * `force-dynamic` because the whole page is per-admin: the queue is different for
 * every caller and a cached render would be another admin's queue.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Moderation — Worth Knowing",
  description: "Comments reported by readers.",
};

export default async function ModerationPage() {
  const page = await getCommentReportsForViewer();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-wide">
          Reported comments
        </h1>
        <p className="text-sm text-muted-foreground">
          One row per report. Nobody who filed one is named here, and nothing
          about a report is visible to the comment&rsquo;s author.
        </p>
      </header>

      {page === null ? (
        <p className="text-sm text-muted-foreground">
          You do not have access to this page.
        </p>
      ) : (
        <CommentReportQueue initialPage={page} />
      )}
    </main>
  );
}
