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
import { descriptionFrom } from "@/lib/description";
import { formatDate } from "@/lib/format";
import { absoluteUrl, siteOgImage } from "@/lib/site";
import { JsonLd } from "@/lib/structured-data";

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

/**
 * A public collection's metadata.
 *
 * The description is the curator's own reason for the grouping, truncated on a
 * word boundary — this is the same `Collection.description` the schema calls "a
 * titled list of links with no reasoning attached… the one thing this product
 * should not render", so it is the part of the page worth putting in a snippet.
 *
 * `CollectionPage` + `ItemList` are emitted below and only for a **public**
 * collection: a private one 404s for anybody but its owner, so it is never
 * indexable and never reaches a crawler.
 *
 * The owner's name is **not** in the metadata. It is public on the page, but a
 * snippet is a different surface — it is what a search result shows, cached and
 * reproduced in contexts the curator did not choose — and a collection has no
 * anonymity flag, so there is no signal saying this person's name is welcome there.
 * The page links the owner; the snippet does not need to.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const collection = await getCollectionOrNotFound(id);
    const path = `/collections/${encodeURIComponent(id)}`;

    const plural = collection.resourceCount === 1 ? "resource" : "resources";

    const description = descriptionFrom(
      collection.description ??
        `A collection of ${collection.resourceCount} ${plural}.`,
    );

    const title = `${collection.title} — Worth Knowing`;

    return {
      title,
      description: description ?? undefined,
      alternates: { canonical: path },
      robots: { index: true, follow: true },
      openGraph: {
        // `website`, not `article`: a collection is a curated listing of other
        // people's contributions, and it writes none of them.
        type: "website",
        title,
        url: absoluteUrl(path) ?? undefined,
        ...(description ? { description } : {}),
        // Explicit because a page's `openGraph` **replaces** the layout's rather
        // than merging into it, so a title set here without an image silently
        // drops the inherited card. See `siteOgImage`.
        images: siteOgImage(),
      },
      twitter: {
        card: "summary_large_image",
        title,
        ...(description ? { description } : {}),
      },
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

      {/*
        `CollectionPage` + `ItemList`, and only these two.

        A public collection genuinely *is* a curated list of items with a stated
        reason for the grouping — the schema calls `description` load-bearing
        rather than decorative — so this describes the page accurately instead of
        reaching for a more impressive type.

        What is deliberately absent is any `Course`/`Book`/`Article`/`VideoObject`
        for the resources inside it. Those assert facts about the linked
        resources — provider, author, duration — and a collection is somebody
        else's curation of links we do not host. Claiming them here would be the
        same misrepresentation as on a resource page.

        No `author` either, even though the owner is always attributed on a
        collection (there is no anonymous mode for one): a collection is a
        statement about taste, and a `Person` node would make the curator an
        author of contributions they did not write. `curator` says what is true.
      */}
      {!collection.isPrivate ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: collection.title,
            ...(collection.description
              ? { description: collection.description }
              : {}),
            url: absoluteUrl(
              `/collections/${encodeURIComponent(collection.id)}`,
            ),
            ...(collection.owner
              ? {
                  about: {
                    "@type": "Person",
                    name: collection.owner.name ?? "a Worth Knowing member",
                    ...(collection.owner.profilePath
                      ? { url: absoluteUrl(collection.owner.profilePath) }
                      : {}),
                  },
                }
              : {}),
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: collection.resourceCount,
              itemListElement: contents.items.map((resource, position) => ({
                "@type": "ListItem",
                position: position + 1,
                name: resource.title,
                url: absoluteUrl(
                  `/resources/${encodeURIComponent(resource.id)}`,
                ),
              })),
            },
          }}
        />
      ) : null}

      <CollectionResourceFeed
        collectionId={collection.id}
        initialItems={contents.items}
        initialNextCursor={contents.nextCursor}
        canCollect={collection.isOwner}
      />
    </div>
  );
}
