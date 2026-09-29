"use client";

import { LibraryIcon, TagIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ResourceCard } from "@/components/resource-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { Resource } from "@/lib/resource-types";
import { listResources } from "@/lib/resources-api";

/**
 * The feed, and the only part of it that is a client component.
 *
 * The first page is already rendered by the Server Component that mounts this,
 * so the feed arrives server-rendered. "Load more" then fetches the next page
 * over the shared `api` instance and *appends* it. A plain `?cursor=` link would
 * be a few lines shorter, but it would swap page one for page two, which reads
 * as a bug rather than as pagination.
 *
 * `key` is set by the parent on the active tag, so changing the filter remounts
 * this and drops the accumulated pages instead of showing page two of the
 * previous tag.
 */
export function ResourceFeed({
  initialItems,
  initialNextCursor,
  tag,
  contributor,
  canShare,
}: {
  initialItems: Resource[];
  initialNextCursor: string | null;
  tag?: string;
  /**
   * Restricts the listing to one contributor's resources, the same as the
   * backend's `?contributor=`.
   *
   * Carried on every "load more" request, and deliberately not derivable from the
   * page it was rendered on: the feed is the one client component here, so the
   * filter has to travel with the cursor or page two of a profile would be page
   * two of the whole feed.
   */
  contributor?: string;
  /** Whether to offer the share call to action in the empty state. */
  canShare: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const page = await listResources({
        tag,
        contributor,
        cursor: nextCursor,
      });

      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      setError("Could not load more resources. Try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (items.length === 0) {
    // A tag filter or a profile with nothing behind it is a dead end, so both
    // offer a way back out. The unfiltered empty state is the first thing a new
    // visitor sees, so it points at the contribution the product is built around.
    const isFiltered = Boolean(tag) || Boolean(contributor);

    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {isFiltered ? <TagIcon /> : <LibraryIcon />}
          </EmptyMedia>
          <EmptyTitle>
            {tag
              ? "Nothing tagged with this yet"
              : contributor
                ? "Nothing shared yet"
                : "Nothing shared yet"}
          </EmptyTitle>
          <EmptyDescription>
            {tag
              ? "No resource carries this tag so far."
              : contributor
                ? "This profile has no contributions that show a name. Anything shared anonymously is not listed, including for the person it belongs to."
                : "Be the first to share something you found worth knowing."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {isFiltered ? (
            <Button asChild variant="outline">
              <Link href="/">See everything</Link>
            </Button>
          ) : canShare ? (
            <Button asChild>
              <Link href="/share">Share something</Link>
            </Button>
          ) : null}
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div>
      {items.map((item) => (
        <ResourceCard key={item.id} resource={item} />
      ))}

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
