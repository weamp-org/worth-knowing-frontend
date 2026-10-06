"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

import { syncAnalyticsIdentity } from "@/lib/analytics";

/**
 * Links PostHog's anonymous identity to the Clerk account on sign-in, and
 * unlinks it on sign-out.
 *
 * Mounted once under `ClerkProvider` (inside `AuthTokenSetter` in the root
 * layout). Renders nothing. The Clerk user id is the PostHog identity — it is
 * also the local `User.id`, so no mapping table exists or is needed — and no
 * person properties are ever attached to it.
 */
export function AnalyticsIdentity() {
  const { userId, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded) syncAnalyticsIdentity(userId ?? null);
  }, [isLoaded, userId]);

  return null;
}
