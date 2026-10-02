"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import { getMyProfile } from "@/lib/profile-api";

/**
 * Whether the signed-in caller is an admin, or `null` while unknown.
 *
 * Fetched from the browser rather than read in the root layout on purpose. The layout
 * is shared by every route, so calling `auth()` there would make the whole app
 * dynamic — including `/contributors`, which currently prerenders. One small
 * authenticated call per page load is a much better trade than that.
 *
 * `null` is a real third state rather than a boolean: "we have not asked yet" and
 * "we asked, and the answer is no" both mean the moderation link should not render,
 * but only one of them is a fact. Render nothing until it resolves — a link that
 * appears a moment after the page does is a far better outcome than flashing it for
 * every signed-in reader and taking it away again.
 *
 * A failure resolves to `false`, not a thrown error: this drives a header link, and
 * an error boundary over the header would take down the page to complain about a
 * menu item. `/moderation` gates for itself and is the thing that actually enforces
 * the role.
 */
export function useIsAdmin(): boolean {
  const { isSignedIn, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Not signed in, or Clerk has not resolved yet — either way there is nobody to
    // ask, and the answer cannot change without a navigation.
    if (!isLoaded || !isSignedIn) {
      setIsAdmin(false);
      return;
    }

    let cancelled = false;

    // The browser's Axios instance carries the Clerk JWT interceptor, so no token
    // is attached here by hand — unlike a Server Component read.
    getMyProfile()
      .then((profile) => {
        if (!cancelled) setIsAdmin(profile.role === "ADMIN");
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  return isAdmin;
}
