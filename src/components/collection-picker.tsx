"use client";

import { CheckIcon, FolderPlusIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import type { CollectionSummary } from "@/lib/collection-types";
import {
  addResourceToCollection,
  removeResourceFromCollection,
} from "@/lib/collections-api";

/**
 * Add or remove this resource from one of your collections.
 *
 * Rendered on a resource's own page. Deliberately *not* a step in
 * `POST /resources`: the central contribution stays exactly as simple as it was,
 * and a resource is collected afterwards from here. The API is the same either
 * way, so this was a choice about the share form rather than a limitation.
 *
 * **The collection list arrives as a prop, already answered.** An earlier version
 * fetched it from here, on open, and that was wrong: the button's entire job is
 * to say whether this resource is already saved, and a control that reads "Save"
 * until you click it makes you re-save things you have saved — or worse, leave
 * because you cannot tell. A client-side cache cannot fix that either, because
 * on a server-rendered page its best case is "still loading" on arrival. The
 * resource page already re-renders per request, so it asks once and passes the
 * answer down, and this control is correct on first paint with no loading state
 * to get wrong.
 *
 * That is also why there is no `useUser()` here. The page already called `auth()`
 * and decided whether to render this at all, so the gate is server-side and
 * authoritative rather than a client check that resolves a tick later.
 *
 * The one request `?resourceId=` buys is membership for every collection at once
 * rather than one per collection — the difference between this list costing a
 * round trip and costing as many as you own lists.
 */
export function CollectionPicker({
  resourceId,
  initialCollections,
}: {
  resourceId: string;
  initialCollections: CollectionSummary[];
}) {
  // Local state, seeded from the server's answer, because the optimistic toggle
  // below has to survive re-renders and the server is not re-consulted after
  // every click.
  const [collections, setCollections] =
    useState<CollectionSummary[]>(initialCollections);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const savedCount = collections.filter((c) => c.containsResource).length;

  async function toggle(collectionId: string, currentlySaved: boolean) {
    if (pendingId) return;

    setPendingId(collectionId);

    // Optimistic, and rolled back on failure. The row is a one-click toggle with
    // no confirm, so a silent no-op would leave somebody believing a resource is
    // saved when it is not — and they would only find out much later.
    setCollections((current) =>
      current.map((c) =>
        c.id === collectionId ? { ...c, containsResource: !currentlySaved } : c,
      ),
    );

    try {
      if (currentlySaved) {
        await removeResourceFromCollection(collectionId, resourceId);
        toast.success("Removed from the collection.");
      } else {
        await addResourceToCollection(collectionId, resourceId);
        toast.success("Saved to the collection.");
      }
    } catch (error) {
      setCollections((current) =>
        current.map((c) =>
          c.id === collectionId
            ? { ...c, containsResource: currentlySaved }
            : c,
        ),
      );
      toast.error(
        getApiErrorMessage(error, "Could not update that collection."),
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    // `relative` so the panel is positioned against this control rather than
    // against the page. The resource page's actions are a flex row, and a plain
    // sibling panel would be laid out as one more item in it.
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        {savedCount > 0 ? (
          <CheckIcon aria-hidden="true" />
        ) : (
          <FolderPlusIcon aria-hidden="true" />
        )}
        {savedCount > 0
          ? `Saved to ${savedCount} ${savedCount === 1 ? "collection" : "collections"}`
          : "Save"}
      </Button>

      {isOpen ? (
        <div className="absolute top-full right-0 z-40 mt-2 w-72 rounded-lg border border-border bg-popover shadow-md">
          {collections.length === 0 ? (
            <div className="px-4 py-4">
              <p className="text-sm text-muted-foreground">
                You have not made a collection yet.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/collections/new">Make one</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {collections.map((collection) => (
                <li
                  key={collection.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <Link
                    href={`/collections/${collection.id}`}
                    className="min-w-0 flex-1 truncate text-sm hover:underline"
                  >
                    {collection.title}
                  </Link>
                  {pendingId === collection.id ? (
                    <Loader2Icon
                      aria-hidden="true"
                      className="size-4 shrink-0 animate-spin text-muted-foreground"
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggle(collection.id, collection.containsResource)
                      }
                    >
                      {collection.containsResource ? (
                        <>
                          <CheckIcon aria-hidden="true" />
                          Saved
                        </>
                      ) : (
                        "Add"
                      )}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
