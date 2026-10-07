import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { CommentReportQueue } from "@/components/comment-report-queue";
import { ResourceReportQueue } from "@/components/resource-report-queue";
import { getCommentReportsForViewer } from "@/lib/comments-queries";
import { getMyProfile } from "@/lib/profile-api";
import { getResourceReportsForViewer } from "@/lib/resource-queries";

/**
 * The moderation queues: contributions and comments people have reported.
 *
 * **Gated twice, and the order is the point.** `auth.protect()` first, then the role,
 * then the queues.
 *
 * This page previously asked the queue, caught a `403` and swapped the result for an
 * error — which could not tell "you are not signed in" from "you are not allowed". A
 * `401` was never caught, so a signed-out visitor landed on the error boundary instead
 * of being redirected. `auth.protect()` first sends them to sign in, which is what
 * `/saved` and `/collections` already do and for the same reason; the role check then
 * only has one possible answer left.
 *
 * The role comes from `GET /users/me/profile`, which returns your own role to you and
 * nothing else. That field exists because the header needs it to decide whether to
 * offer this link at all. It is not a second source of truth — the routes below still
 * enforce `ADMIN` with `@Roles` whatever this says.
 *
 * The "no access" page renders **before** the queues are fetched. The old version
 * spent two requests on a page it was going to refuse.
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
  // Sign in before anything else, so a signed-out visitor is redirected rather than
  // told they cannot see a page they were never eligible for.
  await auth.protect();

  const { getToken } = await auth();
  const { role } = await getMyProfile((await getToken()) ?? undefined);

  if (role !== "ADMIN") {
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

  // Both asked for together rather than one after the other: they are independent
  // reads and there is no reason to make the second wait on the first.
  const [resources, comments] = await Promise.all([
    getResourceReportsForViewer(),
    getCommentReportsForViewer(),
  ]);

  // The routes are `@Roles(ADMIN)` regardless, so this is belt-and-braces. A `null`
  // here would mean the role above and the route disagreed, and rendering nothing is
  // the safe reading of that.
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
