"use client";

import { useQuery } from "@tanstack/react-query";
import { BellIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { unreadNotificationCount } from "@/lib/notifications-api";

/** The query the whole inbox settles through — rows and buttons included. */
export const UNREAD_COUNT_QUERY_KEY = ["notifications", "unread-count"];

/**
 * The header bell.
 *
 * Rendered only for signed-in readers (the header gates it), so there is no
 * signed-out fetch to guard against. Polls the count endpoint — the list
 * itself is server-rendered on the inbox page, and refetching rows to read a
 * number off them would be the list endpoint doing a counter's job.
 *
 * The badge caps at "99+": it answers "anything new", not "how many".
 */
export function NotificationBell() {
  const { data: unread = 0 } = useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: unreadNotificationCount,
    // The agreed delivery mechanism: cheap, matches the Query setup, and no
    // connection to manage. Thirty seconds is fresh enough for a bell.
    refetchInterval: 30_000,
  });

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label={
        unread > 0
          ? `Notifications, ${unread} unread`
          : "Notifications, none unread"
      }
    >
      <Link href="/notifications" className="relative">
        <BellIcon />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
