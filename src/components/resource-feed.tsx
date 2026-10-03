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
import { type ListResourcesParams, listResources } from "@/lib/resources-api";

/**
 * The feed, and the only part of it that is a client component.
 *
 * The first page is already rendered by the Server Component that mounts this,
 * so the feed arrives server-rendered. "Load more" then fetches the next page
 * over the shared `api` instance and *appends* it. A plain `?cursor=` link would
 * be a few lines shorter, but it would swap page one for page two, which reads
 * as a bug rather than as pagination.
 *
 * `filters` is the single source of what this listing is, and it is re-sent on
 * every "load more" request. That is the whole reason it is one object rather
 * than a growing list of individual props: a browse view has seven parameters, a
 * cursor means nothing without all seven, and a prop list invites a call site to
 * forget one. It has already been a bug once — the feed used to take `tag` and
 * `contributor` as separate props, and adding `q` without threading it through
 * would have made page two of a search the entire unfiltered feed.
 *
 * `key` is set by the parent on the active filters, so changing any of them
 * remounts this and drops the accumulated pages.
 */
export function ResourceFeed({
  initialItems,
  initialNextCursor,
  filters,
  canShare,
}: {
  initialItems: Resource[];
  initialNextCursor: string | null;
  /**
   * Everything narrowing this listing — tag, contributor, `q`, type, access level
   * and ordering. Sent again on every "load more" so page two is page two of the
   * same view rather than of the whole site.
   *
   * Deliberately the same shape as `listResources`, so a page passes what it
   * fetched with rather than restating it.
   */
  filters?: ListResourcesParams;
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
      const page = await listResources({ ...filters, cursor: nextCursor });

      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      setError("Could not load more resources. Try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (items.length === 0) {
    /*
     * Three distinct dead ends, worded differently on purpose. A search that
     * matched nothing is the one a person is most likely to reach by accident — a
     * typo, a tag that does not exist — so it names the query and says where it
     * looked, rather than suggesting they share something.
     */
    const { q, tag, contributor } = filters ?? {};
    const isFiltered = Boolean(q) || Boolean(tag) || Boolean(contributor);

    const title = q
      ? "Nothing matched"
      : tag
        ? "Nothing tagged with this yet"
        : "Nothing shared yet";

    const description = q
      ? `No resource matched “${q}”. Search looks at titles, tags, and the reason somebody gave for sharing something.`
      : tag
        ? "No resource carries this tag so far."
        : contributor
          ? "This profile has no contributions that show a name. Anything shared anonymously is not listed, including for the person it belongs to."
          : "Be the first to share something you found worth knowing.";

    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {isFiltered ? <TagIcon /> : <LibraryIcon />}
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {isFiltered ? (
            <Button asChild variant="outline">
              <Link href="/browse">Browse everything</Link>
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
