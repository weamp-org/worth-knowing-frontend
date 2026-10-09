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

/**
 * The query the unread count settles through — the header menu, inbox rows
 * and buttons included.
 */
export const UNREAD_COUNT_QUERY_KEY = ["notifications", "unread-count"];

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
 * Separate from the list because the header menu polls this and nothing else —
 * refetching a page of rows every few minutes to read a number off it would be
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

/**
 * The VAPID public key this browser subscribes with, or null when push is
 * disabled server-side.
 *
 * Served rather than baked into env so there is exactly one place the keys
 * live. Public by design — useless without the private half.
 */
export async function getPushPublicKey(): Promise<string | null> {
  const response = await api.get<{ publicKey: string | null }>(
    "/notifications/push-public-key",
  );

  return response.data.publicKey;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Records this browser for push delivery. Upserted on the endpoint. */
export async function subscribePush(
  subscription: PushSubscriptionPayload,
): Promise<void> {
  await api.post("/notifications/push-subscriptions", subscription);
}

/** Forgets this browser. Idempotent. */
export async function unsubscribePush(endpoint: string): Promise<void> {
  await api.delete("/notifications/push-subscriptions", {
    data: { endpoint },
  });
}
