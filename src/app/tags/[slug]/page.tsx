import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

import { PageLoading } from "@/components/page-loading";
import { ResourceCard } from "@/components/resource-card";
import { Button } from "@/components/ui/button";
import { descriptionFrom } from "@/lib/description";
import { getTagBySlug, listResources } from "@/lib/resources-api";
import { absoluteUrl, SITE_NAME, siteOgImage } from "@/lib/site";

/**
 * One tag, and everything people have shared under it.
 *
 * ## Why this is a page and not a filter
 *
 * The twenty-tag nav has always been a **most-used cut**, and it stays one —
 * that is what the count beside each chip is for. But a cut means tag #21 is a
 * real tag, typed by a real person, attached to a real contribution, and
 * invisible in the navigation. Before this route a tag had no address at all: it
 * existed only as `/?tag=<slug>`, a query string on the homepage, which rendered
 * the homepage with six cards swapped and shared the homepage's title and
 * description.
 *
 * So this is a real destination answering a question a person actually has:
 * *what has been said about this, and by whom?* The contributors' reasons are the
 * content — each card carries its `why`, which is the only part of this product
 * that is not a link.
 *
 * ## Pagination is real links, deliberately
 *
 * **Every other list in this app pages through a client `ResourceFeed`, which is
 * right for a reader and wrong here.** "Load more" appends over the API, so there
 * is no URL for page two and a crawler that does not execute JavaScript cannot
 * reach it. That is acceptable for somebody already reading and unacceptable for
 * the one page whose job is to be found — a tag with four hundred resources has
 * forty crawlable pages, and this route has to fix that rather than repeat it.
 *
 * Hence `?cursor=`, which the backend already supports, as an ordinary anchor.
 * The cursor is opaque by design (it carries a row id, not an offset) and is only
 * valid for the same query, which is fine here: the tag is in the path, so a
 * cursor on this page means the same query by construction.
 *
 * `Suspense` below wraps **only the list**, so the tag's name and count are in
 * the first flush and a missing tag still returns a real 404. A `loading.tsx` at
 * the segment root would put the whole page behind a boundary and lose that
 * status — see `docs/resources.md`.
 */

/** How many resources a tag page shows. */
const PAGE_SIZE = 20;

/**
 * Live data on every render, so it must not be prerendered — `pnpm build` runs
 * without the backend up. It also has to be per-request: the set of resources
 * under a tag changes as people share.
 */
export const dynamic = "force-dynamic";

/**
 * One tag by exact slug, for both the metadata and the heading.
 *
 * **An exact lookup, not the nav's substring search.** `GET /tags?query=` matches
 * on a prefix, because the typeahead is somebody typing half-remembered words;
 * this page is not that. `/tags/mach` must not render `/tags/machine-learning` —
 * this page is self-canonical, so two tags answering to one URL means one of them
 * ends up holding the other's canonical identity.
 *
 * `cache` so `generateMetadata` and the body cost one request rather than two.
 */
const getTag = cache(async (slug: string) => {
  try {
    return await getTagBySlug(slug);
  } catch {
    // A missing tag is the page's 404, decided by the body. Metadata must never
    // be the thing that throws, and this is a page that still has to render.
    return null;
  }
});

/**
 * What a tag page says about itself in a snippet.
 *
 * Count-based rather than assembled from the resources: a description that
 * varied with which twenty rows happened to be on the page would make the same
 * URL describe itself differently on every render, which is worse than a plain
 * factual line.
 */
function tagDescription(resourceCount: number): string {
  const plural = resourceCount === 1 ? "resource" : "resources";

  return `${resourceCount} ${plural} shared here, and why their contributors think each one is worth knowing.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  try {
    const tag = await getTag(decoded);

    if (!tag) {
      return { title: `${decoded} — ${SITE_NAME}` };
    }

    const path = `/tags/${encodeURIComponent(decoded)}`;
    const title = `${tag.name} — ${SITE_NAME}`;

    // `?? undefined` because the metadata fields take `string | undefined`, and
    // an empty `description` would render as a blank snippet rather than as
    // nothing at all.
    const description =
      descriptionFrom(tagDescription(tag.resourceCount)) ?? undefined;

    return {
      title,
      description,
      alternates: { canonical: path },
      openGraph: {
        title,
        description,
        url: absoluteUrl(path) ?? undefined,
        type: "website",
        // Explicit because a page's `openGraph` **replaces** the layout's rather
        // than merging into it, so a title set here without an image silently
        // drops the inherited card. See `siteOgImage`.
        images: siteOgImage(),
      },
      twitter: {
        // Also explicit, for the same reason and with the same symptom: without
        // this the card inherits the layout's site-name title, so a shared tag
        // link previews as "Worth Knowing" rather than as the tag.
        card: "summary_large_image",
        title,
        description,
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: SITE_NAME };
  }
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const [{ slug }, { cursor }] = await Promise.all([params, searchParams]);
  const decoded = decodeURIComponent(slug);

  const tag = await getTag(decoded);

  if (!tag) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Tag
        </p>

        <h1 className="font-heading text-4xl font-semibold tracking-wide">
          {tag.name}
        </h1>

        <p className="text-muted-foreground">
          {tagDescription(tag.resourceCount)}
        </p>

        {/*
          The route into the wider search. A chip that filtered the homepage was
          the only previous entrance to a tag, and on a long tail of tags this
          page is the only one — which is the whole reason it exists.
        */}
        <p className="text-sm">
          <Link
            href="/browse"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Browse everything
          </Link>
        </p>
      </header>

      {/*
        Only the list is behind a boundary, so the heading above is in the first
        flush and `notFound()` above still returns a real 404 status.
      */}
      <div className="mt-8">
        <Suspense fallback={<PageLoading />}>
          <TagResourceList slug={decoded} cursor={cursor} />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * The resources under a tag, with a real link to the next page.
 *
 * Separate from the shell so the Suspense boundary can wrap only this — the tag
 * itself has to resolve outside it, or a missing tag would render the spinner and
 * then the 404 with a 200.
 */
async function TagResourceList({
  slug,
  cursor,
}: {
  slug: string;
  cursor?: string;
}) {
  const page = await listResources({
    tag: slug,
    limit: PAGE_SIZE,
    ...(cursor ? { cursor } : {}),
  });

  if (page.items.length === 0) {
    return (
      <p className="text-muted-foreground">
        Nothing here right now.{" "}
        <Link
          href="/share"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Share something
        </Link>
        .
      </p>
    );
  }

  return (
    <div>
      <div>
        {page.items.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} source="tag" />
        ))}
      </div>

      {/*
        An anchor, not the client `ResourceFeed`.

        This is why the page is shaped this way: "Load more" has no URL, so a
        crawler stops at page one. Here page two is a link on the page — which is
        also what makes the back button and a copied link both behave.
      */}
      {page.nextCursor ? (
        <div className="mt-8 flex justify-center">
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/tags/${encodeURIComponent(slug)}?cursor=${encodeURIComponent(page.nextCursor)}`}
            >
              More resources
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
