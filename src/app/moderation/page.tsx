import type { Metadata } from "next";

import { CommentReportQueue } from "@/components/comment-report-queue";
import { ResourceReportQueue } from "@/components/resource-report-queue";
import { getCommentReportsForViewer } from "@/lib/comments-queries";
import { getResourceReportsForViewer } from "@/lib/resource-queries";

/**
 * The moderation queues: contributions and comments people have reported.
 *
 * Admin only, enforced by the backend. There is no role to check on the way in —
 * nothing in the API exposes the caller's own role — so the page asks the queues and
 * renders what it is told. A 403 becomes a plain "no access" answer rather than a
 * throw, because "you are not an admin" is a state to render and not a fault: the
 * error boundary would otherwise tell a signed-in reader their session had broken.
 *
 * Two queues, each paginating on its own keyset, side by side rather than merged.
 * Merging them would mean a cursor spanning two unrelated orderings, which is the
 * same problem `docs/saved.md` refused sort-by-saved for.
 *
 * `force-dynamic` because the whole page is per-admin: the queues are different for
 * every caller and a cached render would be another admin's queue.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Moderation — Worth Knowing",
  description: "Contributions and comments reported by readers.",
};

export default async function ModerationPage() {
  // Both asked for together rather than one after the other: they are independent
  // reads and there is no reason to make the second wait on the first.
  const [resources, comments] = await Promise.all([
    getResourceReportsForViewer(),
    getCommentReportsForViewer(),
  ]);

  // Either being null means the caller is not an admin. They always agree, since both
  // routes are gated the same way, so checking one would do — but asking both is what
  // the two renders below need anyway.
  if (resources === null || comments === null) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
        <h1 className="font-heading text-3xl font-semibold tracking-wide">
          Reported content
        </h1>
        <p className="text-sm text-muted-foreground">
          You do not have access to this page.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-wide">
          Reported content
        </h1>
        <p className="text-sm text-muted-foreground">
          One row per report, in each of two queues. Nobody who filed one is
          named here, and nothing about a report is visible to the person it was
          filed about — including an anonymously shared contribution, which
          stays anonymised in this list.
        </p>
      </header>

      <section
        aria-labelledby="reported-resources"
        className="flex flex-col gap-4"
      >
        <h2
          id="reported-resources"
          className="text-xs font-semibold tracking-widest uppercase text-muted-foreground"
        >
          Contributions
        </h2>
        <ResourceReportQueue initialPage={resources} />
      </section>

      <section
        aria-labelledby="reported-comments"
        className="flex flex-col gap-4"
      >
        <h2
          id="reported-comments"
          className="text-xs font-semibold tracking-widest uppercase text-muted-foreground"
        >
          Comments
        </h2>
        <CommentReportQueue initialPage={comments} />
      </section>
    </main>
  );
}
