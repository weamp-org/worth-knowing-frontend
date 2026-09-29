import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";

import { ResourceFeed } from "@/components/resource-feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { getCachedProfile, getProfileOrNotFound } from "@/lib/profile-queries";
import { listResources } from "@/lib/resources-api";

/**
 * Every render reads live data, so this must not be prerendered — `pnpm build`
 * runs without the backend up. It also has to be per-viewer: a private profile
 * resolves for its owner and 404s for everybody else, so a cached static render
 * would be wrong for one of them.
 */
export const dynamic = "force-dynamic";

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

    return {
      title: `${name} — Worth Knowing`,
      description: profile.bio ?? `Resources shared by ${name}.`,
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
  const resources = await listResources({ contributor: handle });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {profile.imageUrl ? (
            // A plain `<img>`, not `next/image`. The URL is whatever host a
            // person connected to Clerk uploaded to, so `next/image` would
            // reject it without a `remotePatterns` entry per possible host —
            // and a remote pattern that admits everything defeats the point of
            // the optimiser. Decorative, since the display name below is the
            // real heading.
            // biome-ignore lint/performance/noImgElement: see above
            <img
              src={profile.imageUrl}
              alt=""
              className="size-16 rounded-full object-cover"
            />
          ) : null}

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
          <div>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/profile">Edit your profile</Link>
            </Button>
          </div>
        ) : null}
      </header>

      <div className="mt-8">
        <ResourceFeed
          // Keyed on the handle so navigating between two profiles drops the
          // previous one's accumulated pages instead of appending to them.
          key={handle}
          initialItems={resources.items}
          initialNextCursor={resources.nextCursor}
          contributor={handle}
          canShare={userId !== null}
        />
      </div>
    </div>
  );
}
