"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import { getMyProfile } from "@/lib/profile-api";
import type { Profile } from "@/lib/resource-types";

/**
 * The signed-in caller's own profile, or `null` until it resolves or it fails.
 *
 * Fetched from the browser rather than read in the root layout on purpose. The
 * layout is shared by every route, so calling `auth()` there would make the whole
 * app dynamic — including `/contributors`, which currently prerenders. One small
 * authenticated call per page load is a much better trade than that.
 *
 * **`null` is a real third state**, not a boolean: "we have not asked yet" and
 * "we asked, and there is nothing usable" both mean the header renders no link
 * for it, but only one of them is a fact. Render nothing until it resolves — a
 * link that appears a moment after the page does is a far better outcome than
 * flashing it for every signed-in reader and taking it away again.
 *
 * A failure resolves to `null` rather than throwing: this drives header menu
 * items, and an error boundary over the header would take down the page to
 * complain about a menu item. `/moderation` gates for itself and is the thing
 * that actually enforces the role.
 *
 * **Was `useIsAdmin`, widened.** That hook answered one boolean from this same
 * response and threw the rest away, so the header's profile link needed a second
 * call to the same endpoint on the same page. One fetch, both answers — and
 * `useIsAdmin` stays as a thin wrapper so its callers do not have to know that
 * "is an admin" now means "we happen to have the profile".
 */
export function useMyProfile(): Profile | null {
  const { isSignedIn, isLoaded } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    // Not signed in, or Clerk has not resolved yet — either way there is nobody to
    // ask, and the answer cannot change without a navigation.
    if (!isLoaded || !isSignedIn) {
      setProfile(null);
      return;
    }

    let cancelled = false;

    // The browser's Axios instance carries the Clerk JWT interceptor, so no token
    // is attached here by hand — unlike a Server Component read.
    getMyProfile()
      .then((result) => {
        if (!cancelled) setProfile(result);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  return profile;
}

/**
 * Whether the signed-in caller is an admin.
 *
 * A wrapper rather than its own fetch: `useMyProfile` already carries the answer
 * in `role`, and a second `GET /users/me/profile` for the same page would be the
 * same request twice.
 *
 * `false` while the profile is still loading, which is deliberate and is why the
 * moderation link renders nothing rather than flickering — see `useMyProfile`.
 */
export function useIsAdmin(): boolean {
  return useMyProfile()?.role === "ADMIN";
}
