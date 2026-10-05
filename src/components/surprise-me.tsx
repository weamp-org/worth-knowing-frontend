"use client";

import { useQuery } from "@tanstack/react-query";
import { ShuffleIcon } from "lucide-react";

import { ResourceCard } from "@/components/resource-card";
import { Button } from "@/components/ui/button";
import type { Resource } from "@/lib/resource-types";
import { getRandomResource } from "@/lib/resources-api";

/**
 * One resource at random, pre-drawn by the server, with a button to reshuffle.
 *
 * ## Why the first card is not behind a click
 *
 * It was, and the button was a poor first impression: a section headed "Surprise
 * me" whose entire content was another button labelled "Surprise me" promised
 * something without demonstrating any of it.
 *
 * The product's premise is that a resource's value is the contributor's reason for
 * sharing it. Showing that reason immediately is the whole argument, and a control
 * standing in for it is the product asking to be trusted before it has shown
 * anything. So the server draws one and this renders it as an ordinary card — the
 * same `ResourceCard` as the feed above, not a special variant — and the button is
 * demoted to what it actually is: a way to ask for another.
 *
 * ## Why one card and not a grid of six
 *
 * The original brief was a randomised "discover" section. A grid of random cards is
 * the obvious reading and it is the wrong one here. Six cards in a row are
 * skimmable by accident — the eye takes the titles, the reasons go unread — and the
 * surface ends up competing with the feed on the one axis the feed is already better
 * at. One card cannot be skimmed: either the reason gets read or the person leaves.
 *
 * It is also cheaper (`LIMIT 1` rather than six rows).
 *
 * ## Why the query is disabled but still refetchable
 *
 * `enabled: false` with `initialData` is the whole mechanism, and both halves
 * matter:
 *
 * - `enabled: false` stops the mount fetch. Without it the client would draw its
 *   own random resource on hydration and **swap out the card the server rendered**,
 *   so every page load would pay for two draws and the reader would watch the card
 *   change under them. With it, the first paint is the server's draw.
 * - `staleTime: Infinity` keeps that draw from being treated as stale, so
 *   enabling later cannot trigger one either.
 *
 * `refetch()` is then the only thing that draws again, and it is imperative — it
 * bypasses both `enabled` and `staleTime`, and its result propagates to this
 * observer. That is the documented behaviour of the installed version rather than
 * an assumption, and it is what lets the button below stay a plain button with no
 * `wantsSurprise` state and no key counter.
 *
 * The query key is stable for the same reason the earlier draft used a counter
 * before abandoning it: a key that changes per press retires the previous entry,
 * blanks `data` mid-fetch, and flashes the *original* server card back before the
 * next one lands.
 */
export function SurpriseMe({ initialResource }: { initialResource: Resource }) {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["random-resource"],
    queryFn: ({ signal }) => getRandomResource(signal),
    initialData: initialResource,
    enabled: false,
    staleTime: Infinity,
  });

  return (
    <div className="max-w-2xl">
      {/*
        `data` rather than `initialResource`, and the fallback is what makes a
        failed reshuffle harmless: the query keeps its last good value on an error,
        so a reshuffle that fails leaves the reader looking at a real resource
        rather than an error box.
      */}
      <ResourceCard resource={data} />

      {/*
        Below the card rather than above it. Above, it is a control for something
        that is not on screen yet; below, it reads as "and another one", which is
        what it does.
      */}
      <div className="mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <ShuffleIcon aria-hidden />
          {isFetching ? "Finding…" : "Show me another"}
        </Button>
      </div>
    </div>
  );
}
