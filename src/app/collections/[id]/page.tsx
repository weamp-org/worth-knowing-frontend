import { LockIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CollectionOwnerActions } from "@/components/collection-owner-actions";
import { CollectionResourceFeed } from "@/components/collection-resource-feed";
import { Badge } from "@/components/ui/badge";
import {
  getCollectionOrNotFound,
  getCollectionResourcesOrNotFound,
} from "@/lib/collection-queries";
import { formatDate } from "@/lib/format";

/**
 * Per-viewer and never cached: a private collection resolves for its owner and
 * 404s for everyone else, so a shared render would be wrong for one of them.
 *
 * **No `loading.tsx` in this segment, deliberately.** A `loading.tsx` wraps the
 * segment in a Suspense boundary, which makes Next start streaming the response
 * as a 200 before the page can decide anything — and a `notFound()` raised after
 * that point can no longer change the status. This page is one of the two places
 * that calls `notFound()` (the other is `/resources/[id]`), so a loading file here
 * would turn every private-or-missing collection into a 200 that renders the 404
 * body. See `docs/collections.md`.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const collection = await getCollectionOrNotFound(id);

    return {
      title: `${collection.title} — Worth Knowing`,
      description:
        collection.description?.slice(0, 160) ??
        `A collection of ${collection.resourceCount} resources.`,
    };
  } catch {
    // The page itself decides whether this is a 404 or a real fault; metadata
    // should never be the thing that throws. `notFound()` throws a special
    // signal, so it lands here too and falls back to the generic title.
    return { title: "Worth Knowing" };
  }
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Both reads carry a session token, so a private collection is not redacted for
  // the one person who may see it. `Promise.all` because they are independent —
  // a `404` from either is the same 404.
  const [collection, contents] = await Promise.all([
    getCollectionOrNotFound(id),
    getCollectionResourcesOrNotFound(id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <Badge variant="secondary">
            {collection.resourceCount}{" "}
            {collection.resourceCount === 1 ? "resource" : "resources"}
          </Badge>
          {collection.isPrivate ? (
            // Icon plus the word: a padlock alone reads as "protected", and what
            // this actually is, is "not published".
            <span className="inline-flex items-center gap-1">
              <LockIcon aria-hidden="true" className="size-3" />
              Private
            </span>
          ) : null}
          <time dateTime={collection.createdAt}>
            Created {formatDate(collection.createdAt)}
          </time>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-heading text-4xl font-semibold tracking-wide">
            {collection.title}
          </h1>

          {collection.isOwner ? (
            <CollectionOwnerActions
              collectionId={collection.id}
              title={collection.title}
            />
          ) : null}
        </div>

        {collection.description ? (
          <p className="max-w-prose leading-relaxed whitespace-pre-wrap">
            {collection.description}
          </p>
        ) : null}

        {/*
          The owner is always attributed — a collection is a statement by
          somebody about what they think is worth knowing, and there is no
          anonymous mode. `profilePath` is resolved by the backend, so this links
          only when there is somewhere to go.
        */}
        {collection.owner ? (
          <p className="text-sm text-muted-foreground">
            Collected by{" "}
            {collection.owner.profilePath ? (
              <Link
                href={collection.owner.profilePath}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {collection.owner.name}
              </Link>
            ) : (
              (collection.owner.name ?? "a Worth Knowing member")
            )}
          </p>
        ) : null}
      </header>

      <CollectionResourceFeed
        collectionId={collection.id}
        initialItems={contents.items}
        initialNextCursor={contents.nextCursor}
        canCollect={collection.isOwner}
      />
    </div>
  );
}
