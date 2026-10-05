import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";

import { BrowseFilters } from "@/components/browse-filters";
import { FilterSheet } from "@/components/filter-sheet";
import { ResourceFeed } from "@/components/resource-feed";
import { SearchBox } from "@/components/search-box";
import { TagBadge } from "@/components/tag-badge";
import { browseHref, parseBrowseParams } from "@/lib/browse";
import { listResources, listTags } from "@/lib/resources-api";

/**
 * Every render reads live data from the backend, so this must not be prerendered
 * at build time — `pnpm build` runs without the backend up.
 *
 * Also why the page can read `searchParams` freely: a request-time API already
 * opts the route into dynamic rendering.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse — Worth Knowing",
  description:
    "Search everything shared here, and narrow it by type, access level and order.",
};

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
      <div className="mt-6 hidden sm:block">
        <BrowseFilters
          type={type}
          accessType={accessType}
          sort={sort}
          carry={{ q, tag }}
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
        />
      </div>

      {isFiltered ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {/*
            Deliberately not a result count. Only one page is loaded, so the number
            on screen is the page size rather than the size of the result set, and
            saying "Showing 20 results" for a thousand matches is a small lie that
            is worse than saying nothing.
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
        />
      </div>
    </div>
  );
}
