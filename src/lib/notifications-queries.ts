import { auth } from "@clerk/nextjs/server";
import type { PaginatedNotifications } from "@/lib/notification-types";
import { listNotifications } from "@/lib/notifications-api";

/**
 * Server-side reads for the inbox.
 *
 * The token is fetched here rather than left to the shared Axios instance,
 * because that instance's JWT interceptor only exists in the browser bundle —
 * `AuthTokenSetter` installs it from a `useEffect`. A Server Component therefore
 * attaches the header itself, exactly as `getSavedForViewer` does.
 */

/** Your notifications, newest first. First page only — see the page comment. */
export async function getNotificationsForViewer(): Promise<PaginatedNotifications> {
  const { getToken } = await auth();

  return listNotifications({ token: (await getToken()) ?? undefined });
}
