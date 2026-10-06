"use client";

import { LibraryIcon } from "lucide-react";
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
import { listCollectionResources } from "@/lib/collections-api";
import type { Resource } from "@/lib/resource-types";

/**
 * A collection's contents, and the only part of it that is a client component.
 *
 * The first page is already rendered by the Server Component that mounts this,
 * so the list arrives server-rendered. "Load more" then fetches the next page
 * over the shared `api` instance and *appends* it — a plain `?cursor=` link would
 * swap page one for page two, which reads as a bug rather than as pagination.
 * Same shape as `ResourceFeed`, which is the same decision for the same reason.
 *
 * `ResourceCard` is reused verbatim: it is isomorphic and takes a `Resource`, and
 * a resource inside a collection is a resource. The byline still shows the
 * original contributor, which is the point — a collection is somebody's
 * curation, not a claim of authorship.
 */
export function CollectionResourceFeed({
  collectionId,
  initialItems,
  initialNextCursor,
  canCollect,
}: {
  collectionId: string;
  initialItems: Resource[];
  initialNextCursor: string | null;
  /**
   * Whether the signed-in reader is the owner, so the empty state can offer to
   * help rather than leaving a stranger staring at an empty page.
   */
  canCollect: boolean;
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
      const page = await listCollectionResources(collectionId, {
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
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LibraryIcon />
          </EmptyMedia>
          <EmptyTitle>Nothing collected yet</EmptyTitle>
          <EmptyDescription>
            {canCollect
              ? "Open any resource and use Save to add it here."
              : "This collection is empty for now."}
          </EmptyDescription>
        </EmptyHeader>
        {canCollect ? (
          <EmptyContent>
            <Button asChild variant="outline">
              <Link href="/">Find something</Link>
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <div>
      {items.map((item) => (
        <ResourceCard key={item.id} resource={item} source="collection" />
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
