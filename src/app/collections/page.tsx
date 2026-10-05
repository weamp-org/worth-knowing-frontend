import { auth } from "@clerk/nextjs/server";
import { LibraryIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CollectionCard } from "@/components/collection-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCachedMyCollections } from "@/lib/collection-queries";

/**
 * Every render reads live data, so this must not be prerendered — `pnpm build`
 * runs without the backend up. It also has to be per-viewer: the list is scoped
 * to the caller, so a shared static render would be wrong for everyone.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your collections — Worth Knowing",
  description: "The resources you have gathered together.",
};

export default async function CollectionsPage() {
  // `protect` both gates the page and hands back the id, which the cache key
  // needs — the listing is per-account.
  const { userId } = await auth.protect();

  const { items } = await getCachedMyCollections(userId);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl font-semibold tracking-wide">
            Your collections
          </h1>
          <p className="mt-3 text-muted-foreground">
            Resources you have gathered together. They stay private until you
            say otherwise.
          </p>
        </div>

        <Button asChild>
          <Link href="/collections/new">New collection</Link>
        </Button>
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LibraryIcon />
              </EmptyMedia>
              <EmptyTitle>No collections yet</EmptyTitle>
              <EmptyDescription>
                A collection groups resources that belong together — the reading
                list you keep coming back to, the four papers that explain a
                field. You can add to it from any resource.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/collections/new">Make your first one</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          items.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))
        )}
      </div>

      {/*
        The way out of a dead end.

        This page is `auth.protect()`ed and scoped to the caller, so somebody who
        followed a link to somebody else's public collection lands here on their
        own list — empty, with no indication that the thing they came to look at
        exists and lives somewhere else. That is the whole cost of keeping this
        route private: it is the right page for the word "your", and the wrong one
        to be the only collections URL somebody can reach.

        Points at both real surfaces rather than inventing a browse route. The
        home section is chronological and site-wide; a profile is one person's
        taste as a set, which is the better of the two for a specific collection.
        `?owner=` would work here as well, but it renders this page's heading and
        empty state, which both say "your".
      */}
      <p className="mt-10 text-sm text-muted-foreground">
        After a collection you made public, it appears on the home page under{" "}
        <Link href="/#collections" className="underline underline-offset-4">
          Recently collected
        </Link>
        , and on your profile for anyone who visits it.
      </p>
    </div>
  );
}
