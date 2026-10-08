import api from "@/lib/api";
import type {
  Notification,
  PaginatedNotifications,
} from "@/lib/notification-types";

/**
 * Inbox reads and writes.
 *
 * Every call goes through the shared `api` instance, for the reason
 * `resources-api.ts` documents: `AuthTokenSetter` installs the Clerk JWT
 * interceptor on that one instance, so anything else would be unauthenticated.
 *
 * Every route here is authenticated — there is no public version of somebody's
 * inbox — so a Server Component must attach the token itself. See
 * `notifications-queries.ts`.
 */

/** Your notifications, newest first. Cursor-paginated like every other list. */
export async function listNotifications(
  options: { token?: string; cursor?: string } = {},
): Promise<PaginatedNotifications> {
  const response = await api.get<PaginatedNotifications>("/notifications", {
    params: options.cursor ? { cursor: options.cursor } : undefined,
    ...(options.token
      ? { headers: { Authorization: `Bearer ${options.token}` } }
      : {}),
  });

  return response.data;
}

/**
 * How many of your notifications are unread.
 *
 * Separate from the list because the header bell polls this and nothing else —
 * refetching a page of rows every 30 seconds to read a number off it would be
 * the list endpoint doing a counter's job.
 */
export async function unreadNotificationCount(): Promise<number> {
  const response = await api.get<{ count: number }>(
    "/notifications/unread-count",
  );

  return response.data.count;
}

/** Marks one notification read and returns it. Idempotent. */
export async function markNotificationRead(id: string): Promise<Notification> {
  const response = await api.patch<Notification>(
    `/notifications/${encodeURIComponent(id)}/read`,
  );

  return response.data;
}

/** Marks the whole inbox read. Returns how many rows moved. */
export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const response = await api.post<{ updated: number }>(
    "/notifications/read-all",
  );

  return response.data;
}
