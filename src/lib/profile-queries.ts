import { auth } from "@clerk/nextjs/server";
import axios from "axios";
import { notFound } from "next/navigation";
import { cache } from "react";

import { getMyProfile, getProfile } from "@/lib/profile-api";
import type { Profile } from "@/lib/resource-types";

/**
 * Server-side profile reads.
 *
 * Every one of these carries the Clerk token itself. The Axios interceptor that
 * attaches the JWT is installed by `AuthTokenSetter`, a client component, so it
 * never runs on the server — a server-side call without the token gets the
 * signed-out answer, which for a private profile is a 404 shown to its own
 * owner.
 *
 * `cache` dedupes within a render pass, so a page that needs the profile in both
 * `generateMetadata` and its body fetches it once.
 */

/** The caller's own profile, with a contribution count. Never 404s. */
export const getCachedMyProfile = cache(async (): Promise<Profile> => {
  const { getToken } = await auth();

  return getMyProfile((await getToken()) ?? undefined);
});

/**
 * Somebody's public profile, read with a session when there is one.
 *
 * Dedupe key includes the viewer, because the answer genuinely differs by
 * viewer: an owner of a private profile gets it, a stranger does not. Sharing one
 * cached entry between the two would show a private profile to a stranger, or 404
 * it for its owner.
 */
export const getCachedProfile = cache(
  async (username: string, viewerId: string | null): Promise<Profile> => {
    const { getToken } = await auth();

    return getProfile(
      username,
      viewerId ? ((await getToken()) ?? undefined) : undefined,
    );
  },
);

/**
 * Turns a 404 into the app's 404 page.
 *
 * A private profile is a 404 for the same reason an absent one is: answering 403
 * would confirm the username exists, which is the one fact the contributor asked
 * to withhold. So this cannot distinguish them, and should not try to — the
 * wording has to be true for both.
 *
 * The HTTP status will be 200 rather than 404 when this runs during a streamed
 * render, because `src/app/loading.tsx` puts every route behind a Suspense
 * boundary and the status can no longer be changed once bytes are on the wire.
 * Next compensates with a `noindex` meta tag. Same trade-off as
 * `resource-queries.ts`; see `docs/resources.md`.
 *
 * Anything else is rethrown, so an outage reaching the error boundary is not
 * mistaken for a profile that does not exist.
 */
export async function getProfileOrNotFound(username: string): Promise<Profile> {
  const { userId } = await auth();

  try {
    return await getCachedProfile(username, userId);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      notFound();
    }

    throw error;
  }
}

/**
 * The caller's username, or null when they have not claimed one.
 *
 * The share gate's question. `null` means exactly one thing — no username — and
 * a failed read throws, so a caller can trust the distinction.
 */
export async function getMyUsername(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  // Thrown, not swallowed. This used to return `null` on failure too, which made
  // "the backend is down" indistinguishable from "you have not chosen a
  // username" — and since the share gate *blocks* on `null`, a transient error
  // locked somebody out of sharing with a message about usernames, which is both
  // untrue and unactionable. They could not have shared anyway with the backend
  // unreachable, so the error boundary costs nothing and is honest.
  return (await getCachedMyProfile()).usernameLower;
}
