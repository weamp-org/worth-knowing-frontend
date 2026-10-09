"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  markAllNotificationsRead,
  UNREAD_COUNT_QUERY_KEY,
} from "@/lib/notifications-api";

/**
 * Clears the inbox.
 *
 * Settles both halves: the menu badge through the shared count query, the list
 * itself through a router refresh, which re-renders the server rows as read.
 * Disabled when there is nothing to clear — a button that fires a no-op is
 * noise, and the unread count arriving here is what decides.
 */
export function MarkAllReadButton({ unread }: { unread: number }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (unread === 0) return null;

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        setPending(true);

        void markAllNotificationsRead().then(() => {
          void queryClient.invalidateQueries({
            queryKey: UNREAD_COUNT_QUERY_KEY,
          });
          router.refresh();
        });
      }}
    >
      {pending ? "Marking read…" : "Mark all read"}
    </Button>
  );
}
