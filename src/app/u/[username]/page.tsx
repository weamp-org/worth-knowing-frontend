import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { CollectionCard } from "@/components/collection-card";
import { ResourceFeed } from "@/components/resource-feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCachedPublicCollections } from "@/lib/collection-queries";
import { descriptionFrom } from "@/lib/description";
import { formatDate } from "@/lib/format";
import { getCachedProfile, getProfileOrNotFound } from "@/lib/profile-queries";
import { listResources } from "@/lib/resources-api";
import { absoluteUrl, siteOgImage } from "@/lib/site";
import { JsonLd } from "@/lib/structured-data";

/**
 * Every render reads live data, so this must not be prerendered — `pnpm build`
 * runs without the backend up. It also has to be per-viewer: a private profile
 * resolves for its owner and 404s for everybody else, so a cached static render
 * would be wrong for one of them.
 */
export const dynamic = "force-dynamic";

/**
 * A public profile's metadata.
 *
 * ## What a profile is, for search purposes
 *
 * This product's differentiation is that a resource arrives with a *name on it*.
 * A profile page is where that name has a body: it is a person's public record of
 * what they have found worth knowing and why. So it is indexable, self-canonical
 * on its clean route, and described by the bio when there is one.
 *
 * The description falls back to a factual count rather than to nothing — a
 * snippet saying only the person's name says nothing about the page.
 *
 * ## Privacy, which is the load-bearing part
 *
 * - **A private profile is not reachable.** `GET /users/:username` answers 404
 *   for anybody but the owner, so this metadata never runs for one, and Next
 *   injects `noindex` on the 404 page. There is no `isProfilePrivate` check here
 *   because there is nothing to check — the data never arrives.
 * - **The bio is opt-in text.** It is what the person chose to say publicly, and
 *   it is already on the page. Nothing is pulled from anywhere else to fill the
 *   snippet.
 * - **The structured data is guarded** on `usernameLower`, because an
 *   unclaimed account has no URL to be the subject of, and emitting a `Person`
 *   node with a `url` that 404s would be inventing an identity.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const { userId } = await auth();

  try {
    // The same cached call the body makes, so this costs one request rather than
    // two. A private profile 404s for a stranger, which lands on the generic
    // title below rather than failing the page.
    const profile = await getCachedProfile(username, userId);

    // Never interpolated as `null`. The server already resolved `name` from the
    // Clerk name or the claimed handle; this is the belt-and-braces version of
    // the same rule, because a template literal will happily print "null".
    const name =
      profile.name ?? profile.usernameLower ?? "A Worth Knowing member";

    const plural =
      profile.resourcesCount === 1 ? "contribution" : "contributions";

    const description = descriptionFrom(
      profile.bio ??
        `${profile.resourcesCount} ${plural} shared here, and why their contributor thought each one was worth knowing.`,
    );

    const path = `/u/${encodeURIComponent(username)}`;

    return {
      title: `${name} — Worth Knowing`,
      description: description ?? undefined,
      alternates: { canonical: path },
      robots: { index: true, follow: true },
      openGraph: {
        type: "profile",
        title: `${name} — Worth Knowing`,
        url: absoluteUrl(path) ?? undefined,
        ...(description ? { description } : {}),
        // Explicit because a page's `openGraph` **replaces** the layout's rather
        // than merging into it, so a title set here without an image silently
        // drops the inherited card. See `siteOgImage`.
        images: siteOgImage(),
      },
      twitter: {
        card: "summary_large_image",
        title: `${name} — Worth Knowing`,
        ...(description ? { description } : {}),
      },
    };
  } catch {
    // The page itself decides whether this is a 404 or a real fault; metadata
    // should never be the thing that throws.
    return { title: "Worth Knowing" };
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const { userId } = await auth();

  // A private profile is a 404 here, for the same reason it is one on the wire:
  // a 403 would confirm the handle exists, which is the one fact the contributor
  // asked to withhold. So the 404 page has to read as true for both a handle
  // nobody has claimed and one that exists but is hidden.
  const profile = await getProfileOrNotFound(username);

  // The stored identity, not what was typed in the URL. A profile with no
  // username cannot be reached by URL at all, so this is always set in practice —
  // but falling back to the param keeps the listing query well-formed rather
  // than sending `contributor=` and matching every unclaimed account.
  const handle = profile.usernameLower ?? username;

  // Independent reads, so one round trip. The collections list is public and
  // filters private ones out server-side, so it needs no token and returns the
  // same thing to every viewer.
  const [resources, publicCollections] = await Promise.all([
    listResources({ contributor: handle }),
    getCachedPublicCollections(handle),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            imageUrl={profile.imageUrl}
            name={profile.name ?? handle}
            size="lg"
          />

          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-4xl font-semibold tracking-wide">
              {profile.name ?? handle}
            </h1>
            {profile.usernameLower ? (
              <p className="text-sm text-muted-foreground">
                /u/{profile.usernameLower}
              </p>
            ) : null}
          </div>
        </div>

        {profile.bio ? (
          <p className="max-w-prose leading-relaxed whitespace-pre-wrap">
            {profile.bio}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">
            {profile.resourcesCount}{" "}
            {profile.resourcesCount === 1 ? "contribution" : "contributions"}
          </Badge>
          <span>Joined {formatDate(profile.createdAt)}</span>
        </div>

        {/*
          Only for the owner, so a hidden profile is still fixable. Decided by
          the backend rather than by comparing ids here: the profile response
          carries no id to compare against, and inferring ownership on the client
          would eventually put an edit link on somebody else's profile.
        */}
        {profile.isOwner ? (
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/profile">Edit your profile</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/collections">Your collections</Link>
            </Button>
          </div>
        ) : null}
      </header>

      {/*
        Public collections. This was the *only* way one was discovered and is no
        longer the only one — the home page has a chronological "Recently
        collected" section now.

        Kept here regardless, because it is the better of the two surfaces for a
        collection: the home section is a firehose where one prolific curator can
        take every slot, whereas this shows one person's taste as a set, next to
        the contributions expressing that same taste. That was always the argument
        for listing them on a profile — "belongs beside the contributions that
        express the same taste" — and it is a better argument now that there is a
        competing surface, not a weaker one.

        Only public ones. A private collection 404s for anybody but its owner, so
        asking for it would be asking for a list of 404s.
      */}
      {/*
        `ProfilePage` + `Person`, and only when there is a handle.

        Guarded on `usernameLower` because an unclaimed account has no address to
        be the subject of: a `Person` whose `url` 404s is an identity invented for
        a page that does not exist. The handle is also the thing this product
        guarantees a contribution has — `/share` gates on holding one, so a profile
        that exists and is public is reachable at a stable URL.

        **`sameAs` deliberately lists nothing else.** There is no other profile the
        product knows this person has, and pointing at a guess would be worse than
        omitting it.

        The `Person` describes *this* profile's owner and nothing about the
        contributions listed below them. Those are other people's pages with their
        own authors, and a resource shared anonymously has no author to emit —
        `ContributorByline` already handles those three states distinctly, and this
        must not flatten them.
      */}
      {profile.usernameLower ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            url: absoluteUrl(`/u/${encodeURIComponent(profile.usernameLower)}`),
            mainEntity: {
              "@type": "Person",
              name: profile.name ?? profile.usernameLower,
              ...(profile.bio ? { description: profile.bio } : {}),
              url: absoluteUrl(
                `/u/${encodeURIComponent(profile.usernameLower)}`,
              ),
              ...(profile.imageUrl ? { image: profile.imageUrl } : {}),
            },
          }}
        />
      ) : null}

      {publicCollections.items.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Collections
          </h2>
          <div className="mt-2">
            {publicCollections.items.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-8">
        <ResourceFeed
          // Keyed on the handle so navigating between two profiles drops the
          // previous one's accumulated pages instead of appending to them.
          key={handle}
          initialItems={resources.items}
          initialNextCursor={resources.nextCursor}
          filters={{ contributor: handle }}
          canShare={userId !== null}
        />
      </div>
    </div>
  );
}
