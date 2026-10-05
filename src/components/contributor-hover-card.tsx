"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getProfile } from "@/lib/profile-api";
import type { Profile } from "@/lib/resource-types";

/**
 * A contributor's byline, with a profile card on hover.
 *
 * **Only rendered when there is somewhere to go.** The caller checks `profilePath`
 * and falls back to the plain byline when it is null, so this component is never
 * asked to describe a profile it cannot link to. That is the whole reason the
 * `profilePath` rule in `contributor.tsx` is absolute — a card that opens onto a
 * 404 is worse than no card, because it promises a destination it cannot deliver.
 *
 * **The card is fetched on hover, not carried in the feed payload.** `bio` and
 * `resourcesCount` are not on `ContributorSummaryDto`, and that is deliberate:
 * `bio` is gated behind profile privacy, so putting it on every feed row would
 * leak the bio of somebody who set `isProfilePrivate` — on a card whose
 * `profilePath` is null precisely because the backend decided they are not
 * reachable. `GET /users/:username` is already `@Public()`, already returns both
 * fields, and already 404s a private profile for a non-owner, so hovering it
 * inherits the privacy rule instead of reimplementing it.
 *
 * The cost is one request per hover, so the result is **cached in a module-level
 * map** and shared across every card for that person on the page. Hovering the
 * same contributor in the feed costs one request; hovering them again, or on
 * another card, costs none.
 */
export function ContributorHoverCard({
  profilePath,
  name,
  imageUrl,
  avatarSize,
}: {
  /** Resolved by the server. Non-null here — the caller filtered, we do not. */
  profilePath: string;
  name: string;
  imageUrl: string | null;
  avatarSize: "sm" | "md";
}) {
  const [profile, setProfile] = useState<Profile | null>(
    cache.get(profilePath) ?? null,
  );
  const [open, setOpen] = useState(false);

  const username = profilePath.replace(/^\/u\//, "");

  useEffect(() => {
    // Not open, and not yet asked: nothing to do. Checking this first is what
    // keeps a page of twenty cards from issuing twenty requests on load.
    if (!open || profile || cache.has(profilePath)) return;

    let cancelled = false;

    getProfile(username)
      .then((result) => {
        if (cancelled) return;
        cache.set(profilePath, result);
        setProfile(result);
      })
      .catch(() => {
        // A 404 here means the profile went private, or the handle was released,
        // between the feed rendering and the hover. The byline is still correct —
        // the name is still the name — so the card simply stays in its minimal
        // state. Deliberately swallowed: an error boundary here would take down
        // a feed card over a hover panel.
      });

    return () => {
      cancelled = true;
    };
  }, [open, profile, profilePath, username]);

  return (
    <HoverCard openDelay={200} closeDelay={150} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>
        {/* The trigger is the whole byline, not just the avatar: the avatar is
            28px, which is a small target, and the name beside it is what people
            actually reach for. `asChild` keeps the existing markup and its
            underline behaviour rather than wrapping it in a button. */}
        <span className="inline-flex cursor-default items-center gap-1.5">
          <Avatar imageUrl={imageUrl} name={name} size={avatarSize} />
          <span>
            Shared by{" "}
            <Link href={profilePath} className="hover:underline">
              {name}
            </Link>
          </span>
        </span>
      </HoverCardTrigger>

      <HoverCardContent className="w-80">
        <div className="flex items-start gap-3">
          <Avatar imageUrl={imageUrl} name={name} size="md" />

          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-base font-semibold tracking-wide">
              {profile?.name ?? name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{username}</p>
          </div>
        </div>

        {/* Reserve nothing while loading rather than a skeleton: the card opens on
            hover, and a panel that reflows as three separate blocks arrive reads
            as three flickers. It fills in place. */}
        {profile?.bio ? (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed">
            {profile.bio}
          </p>
        ) : null}

        {profile ? (
          <p className="mt-3 text-xs text-muted-foreground tabular-nums">
            {profile.resourcesCount}{" "}
            {profile.resourcesCount === 1 ? "resource" : "resources"} shared
          </p>
        ) : null}

        <Link
          href={profilePath}
          className="mt-3 inline-block text-sm underline underline-offset-4 hover:text-foreground"
        >
          View profile
        </Link>
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Profiles already fetched this session, keyed by resolved path.
 *
 * Module-level rather than per-component so two cards for the same contributor —
 * which the feed has on every page, since people contribute more than once —
 * share one request. **Not scoped to a request lifetime the way the server-side
 * `cache()` reads are**, and that is on purpose: this is a browser, there is no
 * request to scope to, and a contributor's bio does not change between two hovers
 * on one page.
 *
 * Only successful reads are stored. A 404 for a private profile must not be
 * remembered as "this profile has no bio", or a later signed-in read that would
 * succeed would be served the wrong answer.
 */
const cache = new Map<string, Profile>();
