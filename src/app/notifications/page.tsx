import { auth } from "@clerk/nextjs/server";
import { BellIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MarkAllReadButton } from "@/components/mark-all-read-button";
import { NotificationRow } from "@/components/notification-row";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getNotificationsForViewer } from "@/lib/notifications-queries";

/**
 * Every render reads live data, so this must not be prerendered — `pnpm build`
 * runs without the backend up. It is also per-viewer and private: the layout's
 * default `noindex` is exactly right here and is left alone.
 *
 * **No cursor pagination here, on purpose** — the same reasoning as the saved
 * page: the first page from the server, because an inbox is triaged, not
 * browsed. The cursor is implemented on the route for the day it is needed.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications — Worth Knowing",
  description: "Comments on your resources, and replies to your comments.",
};

export default async function NotificationsPage() {
  await auth.protect();

  const { items } = await getNotificationsForViewer();
  const unread = items.filter((item) => item.readAt === null).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl font-semibold tracking-wide">
            Notifications
          </h1>
          <p className="mt-3 text-muted-foreground">
            Comments on your resources, and replies to your comments. Only you
            can see this list.
          </p>
        </div>

        <MarkAllReadButton unread={unread} />
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BellIcon />
              </EmptyMedia>
              <EmptyTitle>All caught up</EmptyTitle>
              <EmptyDescription>
                When somebody comments on something you shared, or replies to
                something you said, it will be here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/">Browse resources</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          items.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
            />
          ))
        )}
      </div>
    </div>
  );
}
