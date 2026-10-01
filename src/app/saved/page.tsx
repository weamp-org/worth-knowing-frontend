import { auth } from "@clerk/nextjs/server";
import { BookmarkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ResourceCard } from "@/components/resource-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSavedForViewer } from "@/lib/saved-queries";

/**
 * Every render reads live data, so this must not be prerendered — `pnpm build`
 * runs without the backend up. It also has to be per-viewer: this list is
 * scoped to the caller, so a shared static render would be wrong for everyone.
 *
 * **No cursor pagination here, on purpose.** The first page only, from the
 * server. Adding "load more" would need a client component mirroring
 * `ResourceFeed`, and unlike a collection or the feed this list is not
 * something anybody browses in depth — it is a short list you pop into, save
 * something from, and leave. If it does turn out to be long, the cursor is
 * already implemented on the route and this becomes a component copy.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved — Worth Knowing",
  description: "The resources you have saved to come back to.",
};

export default async function SavedPage() {
  await auth.protect();

  const { items } = await getSavedForViewer();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl font-semibold tracking-wide">
            Saved
          </h1>
          <p className="mt-3 text-muted-foreground">
            Resources you saved to come back to. Only you can see this list.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/collections">Your collections</Link>
        </Button>
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookmarkIcon />
              </EmptyMedia>
              <EmptyTitle>Nothing saved yet</EmptyTitle>
              <EmptyDescription>
                Save anything worth coming back for, and it will be here. To
                collect resources around an idea, make a collection instead.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/">Find something</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          items.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))
        )}
      </div>
    </div>
  );
}
