import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { ResourceFeed } from "@/components/resource-feed";
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

      <TagFilter tags={tags} activeTag={tag} />

      <div className="mt-6">
        <ResourceFeed
          // Changing the tag has to reset the accumulated pages, or the feed
          // would show page two of the previous tag underneath page one of this
          // one.
          key={tag ?? "all"}
          initialItems={page.items}
          initialNextCursor={page.nextCursor}
          tag={tag}
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
