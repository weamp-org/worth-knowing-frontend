"use client";

import { useUser } from "@clerk/nextjs";
import { CheckIcon, FolderPlusIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  addResourceToCollection,
  listMyCollections,
  removeResourceFromCollection,
} from "@/lib/collections-api";

/**
 * Add or remove this resource from one of your collections.
 *
 * Rendered on a resource's own page, as a popover. Deliberately *not* a step in
 * `POST /resources`: the central contribution stays exactly as simple as it was,
 * and a resource is collected afterwards from here. The API is the same either
 * way, so this was a choice about the share form rather than a limitation.
 *
 * Membership comes from one request, not one per collection. `?resourceId=`
 * makes `GET /collections/me` report it per row, which is the difference between
 * opening this popover costing one round trip and costing as many as you own
 * lists. Asking the backend is also the only way to be right: "is this saved" is
 * not something the client can work out from a resource it already has.
 *
 * Nothing renders for a signed-out reader, and the first render is empty rather
 * than a spinner: a signed-in reader's own action appearing a beat late is
 * unremarkable, whereas a control that flashes and then vanishes is not.
 */
export function CollectionPicker({ resourceId }: { resourceId: string }) {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  const [collections, setCollections] = useState<
    { id: string; title: string; containsResource: boolean }[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;

    // Only once the popover is opened. A signed-out reader never gets here, and
    // a reader who never opens it should not pay for the request.
    if (!isOpen || hasLoaded) return;

    setIsLoading(true);

    // Called from the browser, where the shared instance's interceptor supplies
    // the Clerk JWT. No explicit token here — and none is possible: this needs
    // `useAuth().getToken`, and the interceptor already does exactly that.
    listMyCollections({ resourceId })
      .then((page) => {
        if (cancelled) return;
        setCollections(page.items);
        setHasLoaded(true);
      })
      .catch(() => {
        // A failed read is not a reason to block the button — the person may
        // still want to open it and retry, or to create a list. The list simply
        // stays empty, which reads as "you have no collections yet".
        if (!cancelled) setCollections([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, isSignedIn, hasLoaded, resourceId]);

  // `isLoaded` so a Clerk-signed-out reader does not briefly see the control on
  // the way to resolving.
  if (!isLoaded || !isSignedIn) return null;

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

      // A collection's own page shows a count and a listing that are now stale.
      // `force-dynamic` means the next visit re-fetches, but the page they are
      // looking at is this one.
      router.refresh();
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
        <FolderPlusIcon aria-hidden="true" />
        {savedCount > 0 ? `Saved (${savedCount})` : "Save"}
      </Button>

      {isOpen ? (
        <div className="absolute top-full right-0 z-40 mt-2 w-72 rounded-lg border border-border bg-popover shadow-md">
          {isLoading ? (
            <p className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
              <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
              Loading your collections…
            </p>
          ) : collections.length === 0 ? (
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
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {collection.title}
                  </span>
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
