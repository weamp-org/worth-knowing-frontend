"use client";

import {
  BookmarkIcon,
  LibraryIcon,
  MenuIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { PwaInstallMenuItem } from "@/components/pwa-install";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMyProfile } from "@/lib/use-my-profile";

/**
 * The signed-in header's secondary destinations, behind one button.
 *
 * These used to sit in the header as their own ghost buttons, which is
 * what made it noisy: a wordmark plus four words inside a `max-w-3xl` container,
 * four of them similar-length and similarly quiet, so nothing stood out as the
 * thing to do. `Share something` now stands alone as the only filled control,
 * which is the point of it being there.
 *
 * Three items are unconditional (Saved, Collections, Settings), and two are
 * conditional on what the backend can actually resolve for this caller: the
 * profile link and Moderation. Both omit themselves rather than rendering
 * disabled, because a greyed-out item reads as "not allowed" and invites the
 * reader to work out why.
 *
 * A real `DropdownMenu` rather than a hand-rolled panel, because a disclosure
 * that opens a list of links owes the keyboard outside-click-to-close, Escape,
 * focus handling and arrow-key navigation. `CollectionPicker` gets away with a
 * plain absolutely-positioned `<div>` because it opens a single row of toggles and
 * is not a navigation surface.
 *
 * Ordered by how often each is reached for, with Settings last and separated —
 * it is configuration rather than somewhere you go to look at something.
 *
 * **Moderation is here, and only for admins.** `/moderation` was reachable only by
 * typing the URL. The alternatives were worse: no link at all leaves the feature
 * undiscoverable, and an unconditional link puts a dead end in front of every
 * signed-in reader on a product that has no other admins yet.
 */
export function HeaderMenu() {
  // One request answers both questions this menu asks. `useIsAdmin` used to fetch
  // the same profile for its `role` and discard the rest; adding the profile link
  // would have been the second fetch of the identical endpoint on the same page.
  const profile = useMyProfile();
  const isAdmin = profile?.role === "ADMIN";

  /*
   * `/u/<handle>`, and only when the server would resolve one.
   *
   * A profile is not always a page. `resolveProfilePath` returns null for a private
   * profile and for an unclaimed handle, and `/u/:username` 404s for somebody whose
   * profile is private — **including for them** — so a link built on the username
   * alone would be a dead end in the header, which is the one place that must not
   * have one.
   *
   * Mirrors the rule every byline already follows: link when there is a path, render
   * nothing when there is not. Not a disabled item either, for the reason Moderation
   * below is not — a greyed-out "Your profile" reads as "not allowed" and invites the
   * reader to work out why.
   *
   * The absent-handle case is not a gap here: `/settings/profile` is where a handle
   * gets claimed, and Settings is the last item in this menu.
   */
  const profilePath =
    profile?.usernameLower && !profile.isProfilePrivate
      ? `/u/${profile.usernameLower}`
      : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="px-2">
          <MenuIcon aria-hidden="true" />
          {/* The glyph carries no accessible name on its own. */}
          <span className="sr-only">Menu</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href="/saved">
            <BookmarkIcon aria-hidden="true" />
            Saved
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/collections">
            <LibraryIcon aria-hidden="true" />
            Collections
          </Link>
        </DropdownMenuItem>

        {/*
          Your profile, above Saved rather than below it.

          Order here is how often a thing is reached for, and this one is less often
          than Saved or Collections — so it goes last of the three, not first. It is
          placed before the separators rather than in the configuration group because
          a profile is somewhere you go to look at something, which is the distinction
          this menu already draws with Settings at the bottom.
        */}
        {profilePath ? (
          <DropdownMenuItem asChild>
            <Link href={profilePath}>
              <UserIcon aria-hidden="true" />
              Your profile
            </Link>
          </DropdownMenuItem>
        ) : null}

        {/* Absent for everybody else, so the menu carries no dead end. Not
            `disabled`: a greyed-out Moderation reads as "not allowed" and invites
            the reader to work out why. */}
        {isAdmin ? (
          <>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/moderation">
                <ShieldIcon aria-hidden="true" />
                Moderation
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator />

        <PwaInstallMenuItem />

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
