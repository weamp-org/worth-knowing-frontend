"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { UNREAD_COUNT_QUERY_KEY } from "@/components/notification-bell";
import type { Notification } from "@/lib/notification-types";
import { markNotificationRead } from "@/lib/notifications-api";
import { cn } from "@/lib/utils";

/**
 * One inbox row.
 *
 * A client component for exactly one reason: visiting a notification marks it
 * read. The mark fires without awaiting — blocking navigation on a bookkeeping
 * write would punish the reader for the inbox's sake — and settles the bell
 * through the shared count query. The row's own read styling settles on the
 * next render, which is honest: the write may still be in flight.
 *
 * The actor's name is plain text, not a profile link: the whole row already
 * links to the resource, and a link inside a link is invalid HTML.
 */
export function NotificationRow({
  notification,
}: {
  notification: Notification;
}) {
  const queryClient = useQueryClient();
  const unread = notification.readAt === null;

  const actorName = notification.actor?.name ?? "Someone";
  const headline =
    notification.type === "REPLY_TO_COMMENT"
      ? `${actorName} replied to your comment`
      : `${actorName} commented on your resource`;

  return (
    <Link
      href={`/resources/${notification.resource.id}#comments-heading`}
      onClick={() => {
        if (!unread) return;

        void markNotificationRead(notification.id).then(() => {
          void queryClient.invalidateQueries({
            queryKey: UNREAD_COUNT_QUERY_KEY,
          });
        });
      }}
      className={cn(
        "flex flex-col gap-1 border-b border-border py-5 last:border-b-0",
        unread && "font-medium",
      )}
    >
      <p className="text-sm">
        {headline}{" "}
        <span className="font-heading font-semibold tracking-wide">
          {notification.resource.title}
        </span>
      </p>

      {notification.comment ? (
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {notification.comment.body}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          The comment was removed.
        </p>
      )}
    </Link>
  );
}
