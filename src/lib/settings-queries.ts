import { auth } from "@clerk/nextjs/server";

import { getMySettings } from "@/lib/settings-api";

/**
 * Reads the caller's settings from a Server Component.
 *
 * The route is not `@Public()`, and the Axios interceptor that attaches the
 * Clerk JWT is installed by `AuthTokenSetter` — a client component — so it never
 * runs on the server. A server-side call therefore has to carry the token
 * itself; without it the request 401s, and a caller that swallows the error
 * renders the setting at its default, which reads as "my change did not save".
 *
 * Throws rather than defaulting. A settings page showing a switch in the wrong
 * position is worse than one that admits it could not load, because a toggle
 * left looking off invites the user to save the opposite of what they chose.
 */
export async function getMySettingsForViewer() {
  const { getToken } = await auth();
  const token = await getToken();

  return getMySettings(token ?? undefined);
}
