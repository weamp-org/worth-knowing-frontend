"use client";

import { useState } from "react";

import { ResourceCard } from "@/components/resource-card";
import { ResourceFeedEmpty } from "@/components/resource-feed-empty";
import { Button } from "@/components/ui/button";
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
    return <ResourceFeedEmpty filters={filters} canShare={canShare} />;
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
