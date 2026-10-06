"use client";

import { BookmarkIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { trackResourceSaved, trackResourceUnsaved } from "@/lib/analytics";
import { getApiErrorMessage } from "@/lib/api-error";
import { saveResource, unsaveResource } from "@/lib/saved-api";

/**
 * Save or unsave a resource, with nothing else attached to it.
 *
 * The initial state arrives as a prop because the button's only job is to say
 * whether this resource is already saved. An earlier control on this page — the
 * collection picker — fetched its state on open and so read "Save" for something
 * already saved until you touched it. A client-side cache would not have fixed
 * that either: on a server-rendered page its best case is "still loading" on
 * arrival. The page already calls `auth()` and re-renders per request, so it
 * asks once and passes the answer down.
 *
 * The count is passed too, and updated from the response after each write,
 * because the backend returns the whole resource with a fresh `savedCount` —
 * which is why these calls need no refetch afterwards.
 *
 * Deliberately separate from `CollectionPicker`: saving is one click with no
 * claim attached, collecting is saying "these belong together". They never touch
 * each other, so neither is nested inside the other.
 */
export function SaveButton({
  resourceId,
  initialIsSaved,
  initialSavedCount,
}: {
  resourceId: string;
  /** Whether the signed-in caller has already saved it. Server-decided. */
  initialIsSaved: boolean;
  /** The public count, shown to everybody including signed-out readers. */
  initialSavedCount: number;
}) {
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [savedCount, setSavedCount] = useState(initialSavedCount);
  const [isPending, setIsPending] = useState(false);

  async function toggle() {
    if (isPending) return;

    const wasSaved = isSaved;
    const wasCount = savedCount;

    setIsPending(true);

    // Optimistic, and rolled back on failure. A one-click bookmark with no
    // confirmation that silently did nothing leaves somebody believing they had
    // kept something when they had not — and bookmarks are for keeping things.
    setIsSaved(!wasSaved);
    setSavedCount(wasCount + (wasSaved ? -1 : 1));

    try {
      const resource = wasSaved
        ? await unsaveResource(resourceId)
        : await saveResource(resourceId);

      // Fires only after the write succeeds — never on the optimistic flip
      // above, and never on the rollback below.
      if (wasSaved) {
        trackResourceUnsaved(resourceId);
      } else {
        trackResourceSaved(resourceId);
      }

      // The server's count is authoritative — somebody else may have saved it
      // in the meantime, so it is taken rather than computed locally.
      setSavedCount(resource.savedCount);
    } catch (error) {
      setIsSaved(wasSaved);
      setSavedCount(wasCount);
      toast.error(
        getApiErrorMessage(
          error,
          wasSaved
            ? "Could not remove that from your saved list."
            : "Could not save that.",
        ),
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      variant={isSaved ? "secondary" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={isPending}
      // Says what the button will do, not what is currently true, which is what
      // a screen reader needs from a toggle with no visible label change.
      aria-pressed={isSaved}
    >
      <BookmarkIcon aria-hidden="true" data-filled={isSaved} />
      {isSaved ? "Saved" : "Save"}
      {savedCount > 0 ? (
        <span className="tabular-nums text-muted-foreground">{savedCount}</span>
      ) : null}
    </Button>
  );
}
