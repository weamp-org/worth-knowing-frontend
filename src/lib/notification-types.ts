/**
 * Inbox reads.
 *
 * Mirrors the backend's `NotificationResponse`: the actor as a summary (null
 * when the account is gone — the client words that as "Someone"), the
 * resource as id-plus-title, the comment as id-plus-body (null when deleted —
 * worded as "a comment"). `readAt` null is the unread state; there is no
 * boolean.
 */
export type NotificationType = "COMMENT_ON_RESOURCE" | "REPLY_TO_COMMENT";

export interface NotificationActor {
  id: string;
  name: string | null;
  imageUrl: string | null;
  profilePath: string | null;
}

export interface Notification {
  id: string;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  actor: NotificationActor | null;
  resource: { id: string; title: string };
  comment: { id: string; body: string } | null;
}

export interface PaginatedNotifications {
  items: Notification[];
  nextCursor: string | null;
}
