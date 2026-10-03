import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";

import { ResourceFeed } from "@/components/resource-feed";
import { SearchBox } from "@/components/search-box";
import { TagBadge } from "@/components/tag-badge";
import type { TagSearchResult } from "@/lib/resource-types";
import { listResources, listTags } from "@/lib/resources-api";

/**
 * Every render reads live data from the backend, so this must not be
 * prerendered at build time — `pnpm build` runs without the backend up.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Worth Knowing",
  description:
    "Discover things worth knowing, from people who found them worth knowing.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;

  const [{ userId }, page, tags] = await Promise.all([
    // Only used to decide whether the empty state offers a share button. The
    // feed itself is public either way.
    auth(),
    listResources({ tag }),
    listTags(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading text-4xl font-semibold tracking-wide">
        Worth Knowing
      </h1>
      <p className="mt-3 text-muted-foreground">
        Discover things worth knowing, from people who found them worth knowing.
      </p>

      {/*
        The search field sits here rather than in the header, and the page stays
        the feed rather than becoming a landing page.

        Both are deliberate. `/browse` is where a search *lands*, with the filters
        and the ordering beside it, so this box is a way into that route rather
        than a filter over what is already below it. And the feed stays on `/`
        because moving it would break every shared `/?tag=` link and leave the
        site with no feed at all until the other home sections exist — a landing
        page with one search box on it is not obviously better than this, and the
        split is cheap to make later and expensive to make now.
      */}
      <div className="mt-8">
        <SearchBox id="home-search" />

        {/*
          The way into `/browse` without a query. Submitting an empty box already
          lands there, so this is a discoverability fix rather than a new route —
          but a whole page that only exists if you guess the URL, or happen to
          clear a search box and press enter, is a page most people will never
          find. Deliberately quiet: this is the fallback for someone who did not
          know what to search for, not a second thing to do.
        */}
        <p className="mt-3 text-sm text-muted-foreground">
          Not sure what to look for?{" "}
          <Link
            href="/browse"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Browse everything
          </Link>
          .
        </p>
      </div>

      <TagFilter tags={tags} activeTag={tag} />

      <div className="mt-6">
        <ResourceFeed
          // Changing the tag has to reset the accumulated pages, or the feed
          // would show page two of the previous tag underneath page one of this
          // one.
          key={tag ?? "all"}
          initialItems={page.items}
          initialNextCursor={page.nextCursor}
          filters={{ tag }}
          canShare={userId !== null}
        />
      </div>
    </div>
  );
}

/**
 * The vocabulary, most-used first — `GET /tags` already sorts by usage, so
 * there is nothing to rank here.
 */
function TagFilter({
  tags,
  activeTag,
}: {
  tags: TagSearchResult[];
  activeTag?: string;
}) {
  if (tags.length === 0) return null;

  return (
    <nav aria-label="Filter by tag" className="mt-8 flex flex-wrap gap-2">
      {/* The reset link shares the tag chip's shape. `activeTag` being undefined
          is the unfiltered state, so that is when "Everything" is selected —
          including on a slug that matches no tag, where the empty state says so. */}
      <TagBadge
        tag={{ name: "Everything", slug: "" }}
        active={!activeTag}
        href="/"
      />
      {tags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} active={activeTag === tag.slug} />
      ))}
    </nav>
  );
}
