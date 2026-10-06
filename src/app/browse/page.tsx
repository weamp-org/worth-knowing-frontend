import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";

import { BrowseFilters } from "@/components/browse-filters";
import { FilterSheet } from "@/components/filter-sheet";
import { ResourceFeed } from "@/components/resource-feed";
import { SearchBox } from "@/components/search-box";
import { SearchPerformedTracker } from "@/components/search-performed-tracker";
import { TagBadge } from "@/components/tag-badge";
import { browseHref, parseBrowseParams } from "@/lib/browse";
import { listResources, listTags } from "@/lib/resources-api";
import { absoluteUrl, siteOgImage } from "@/lib/site";

/**
 * Every render reads live data from the backend, so this must not be prerendered
 * at build time — `pnpm build` runs without the backend up.
 *
 * Also why the page can read `searchParams` freely: a request-time API already
 * opts the route into dynamic rendering.
 */
export const dynamic = "force-dynamic";

/**
 * The canonical search and filter view.
 *
 * ## Only the *unfiltered* view is indexable
 *
 * `/browse` with nothing on it is a genuine "everything shared here" listing and
 * is the site's second front door, so it is indexable and self-canonical.
 *
 * Every other state of the same route — a search, a filter, a sort, any
 * combination — is `noindex`, and that is a deliberate split rather than a
 * blanket rule for convenience:
 *
 * - **`?q=` is free text**, so the space of search URLs on this domain is
 *   effectively unbounded, and every one returns 200 with a list. Left indexable,
 *   a crawl of the site walks an infinite duplicate space. `robots.ts`
 *   disallows `?q=` for the same reason.
 * - **The filtered and sorted states are the same content as the unfiltered one**
 *   under a different order or a subset. Self-canonicalising each of them would
 *   tell a crawler every one is a distinct page worth storing; canonicalising them
 *   all to the bare route would claim the filter view has no existence of its own,
 *   which is the opposite problem. `noindex` is the honest third option: the route
 *   is one page, and the states are views of it.
 *
 * So no separate canonical URLs are created for search or sort states — they are
 * not indexed, so there is nothing for a canonical to consolidate.
 *
 * The indexability is decided **here, in the page**, rather than in
 * `generateMetadata`, because it depends on `searchParams`. Static `metadata`
 * cannot read them, and a page that read them there would need the whole route
 * dynamic in a second place for no benefit.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = parseBrowseParams(await searchParams);

  const isFiltered = Boolean(
    params.q || params.tag || params.type || params.accessType || params.sort,
  );

  const description =
    "Search everything shared here, and narrow it by type, access level and order.";

  return {
    title: "Browse — Worth Knowing",
    description,
    ...(isFiltered
      ? {
          // No canonical on a filtered state: it is not indexed, so there is
          // nothing to point a crawler at, and a canonical here would be read as
          // "this is the same page as /browse" — a claim about content that is
          // only true some of the time.
          robots: { index: false, follow: true },
        }
      : {
          alternates: { canonical: "/browse" },
          robots: { index: true, follow: true },
        }),
    openGraph: {
      title: "Browse — Worth Knowing",
      description,
      url: absoluteUrl("/browse") ?? undefined,
      type: "website",
      // Explicit because a page's `openGraph` **replaces** the layout's rather
      // than merging into it, so setting a title here without an image silently
      // drops the inherited card. See `siteOgImage`.
      images: siteOgImage(),
    },
    twitter: {
      card: "summary_large_image",
      title: "Browse — Worth Knowing",
      description,
    },
  };
}

/**
 * The canonical search and filter view.
 *
 * Every piece of state lives in the URL, which is the whole design. A filtered
 * view is then shareable, the back button steps through the filters, and there is
 * no client-side copy of the result set that could disagree with the controls
 * above it — a navigation re-renders this Server Component and the feed remounts
 * with a fresh first page.
 */
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /*
   * Narrowed against the known value sets first. `searchParams` is whatever the
   * URL said, so `?type=BANANA` arrives here; forwarding it would be a 400 and an
   * error page, where dropping it is an unfiltered browse — which is what someone
   * following a stale link wants.
   */
  const params = parseBrowseParams(await searchParams);
  const { q, tag, type, accessType, sort } = params;

  const [{ userId }, page, tags] = await Promise.all([
    // Only used to decide whether the empty state offers a share button. The
    // listing is public either way.
    auth(),
    listResources(params),
    listTags(),
  ]);

  const isFiltered = Boolean(q || tag || type || accessType || sort);

  /*
   * Discovery attribution for resource clicks from this listing: a query
   * means search, a tag means tag, anything else is plain browse. Decided from
   * the parsed params, so a hand-edited `?type=BANANA` counts as what it
   * renders as, not what the URL said.
   */
  const listingSource = q ? "search" : tag ? "tag" : "browse";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading text-4xl font-semibold tracking-wide">
        Browse
      </h1>
      <p className="mt-3 text-muted-foreground">
        Search everything shared here, and narrow it down.
      </p>

      <div className="mt-8">
        <SearchBox
          /*
           * Keyed on the query alone, so the field resets whenever `q` changes —
           * which is what "Clear everything" does, and which otherwise left the
           * box still showing a search whose results were no longer filtered by
           * it. The field holds its value in state, and a changed prop alone does
           * not reach it.
           *
           * Deliberately **not** keyed on the whole URL, which would be the
           * obvious thing to reach for. Changing a filter mid-word would remount
           * the field and swallow what was being typed. `q` is the only input that
           * should discard typing, and the only one that can arrive from somewhere
           * other than the keyboard.
           */
          key={q ?? ""}
          defaultValue={q}
          // Everything except the query itself, so a new search keeps the type,
          // access level and tag the person had already chosen. Dropping them
          // would make searching from inside a filtered view silently discard the
          // filter — the kind of thing nobody notices until they have lost their
          // place.
          carry={{ tag, type, accessType }}
          id="browse-search"
        />
      </div>

      {/*
        One control, two layouts. The inline row is the better experience where
        there is width for it — every change applies immediately, so picking a
        filter is one interaction rather than three. On a phone three full-width
        selects push the results off-screen and make the list jump on each pick,
        so it collapses to a trigger and a sheet.
      */}
      {/*
        Counts come from the listing response rather than a request of their own.

        The whole point of a facet count is that you can trust it, and two requests
        could straddle a save or a delete and disagree — leaving a dropdown promising
        four books above a list showing three, with no way to tell which is lying.
        One response is one snapshot.
      */}
      <div className="mt-6 hidden sm:block">
        <BrowseFilters
          type={type}
          accessType={accessType}
          sort={sort}
          carry={{ q, tag }}
          facets={page.facets}
        />
      </div>

      {/*
        Hidden with CSS rather than unmounted by a media query, which avoids a
        hydration mismatch and a `matchMedia` listener. Both are in the DOM at
        every width, which is why the sheet prefixes its ids instead of sharing
        `filter-type` and friends.
      */}
      <div className="mt-6 sm:hidden">
        <FilterSheet
          type={type}
          accessType={accessType}
          sort={sort}
          carry={{ q, tag }}
          facets={page.facets}
        />
      </div>

      {isFiltered ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {/*
            Still deliberately not a result count, and the reason is unchanged: only
            one page is loaded, so a number here would be the page size rather than
            the size of the result set, and saying "20 results" for a thousand
            matches is a small lie that is worse than saying nothing.

            What *is* shown is the per-facet totals inside the filter dropdowns, and
            those are honest — `page.facets` counted the whole matching set, not the
            rows that happen to be on screen. `Any type (24)` is a real count of real
            matches.
          */}
          Filtering this view.{" "}
          <Link
            href="/browse"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Clear everything
          </Link>
        </p>
      ) : null}

      {tags.length > 0 ? (
        <nav
          aria-label="Filter by tag"
          className="mt-6 flex flex-wrap gap-2 border-t border-border pt-6"
        >
          <TagBadge
            tag={{ name: "Everything", slug: "" }}
            active={!tag}
            // Clears the tag and nothing else. Resetting the whole view from one
            // chip would throw away a search and two filters that nobody asked to
            // lose.
            href={browseHref({ ...params, tag: undefined })}
          />
          {tags.map((entry) => (
            <TagBadge
              key={entry.id}
              tag={entry}
              active={tag === entry.slug}
              href={browseHref({ ...params, tag: entry.slug })}
            />
          ))}
        </nav>
      ) : null}

      <div className="mt-6">
        {/*
          Fires `search_performed` once for a committed search render. The raw
          query never leaves the client — only its length bucket travels — and
          the total comes from the listing facets (the whole matching set),
          not the page size. Filter-only views mount nothing.
        */}
        {q ? (
          <SearchPerformedTracker
            key={browseHref(params)}
            queryLength={q.trim().length}
            hasTagFilter={Boolean(tag)}
            hasTypeFilter={Boolean(type)}
            hasAccessFilter={Boolean(accessType)}
            resultCount={Object.values(page.facets.byType).reduce(
              (sum, count) => sum + count,
              0,
            )}
            sort={sort ?? "relevance"}
            isAuthenticated={userId !== null}
            dedupeKey={browseHref(params)}
          />
        ) : null}
        <ResourceFeed
          /*
           * Remounted whenever any filter changes, so accumulated pages are
           * dropped rather than showing page two of the previous filter underneath
           * page one of this one. The key is the URL, which changes exactly when
           * the listing does.
           */
          key={browseHref(params)}
          initialItems={page.items}
          initialNextCursor={page.nextCursor}
          filters={params}
          canShare={userId !== null}
          source={listingSource}
        />
      </div>
    </div>
  );
}
