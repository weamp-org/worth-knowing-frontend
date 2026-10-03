"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type BrowseParams, browseHref } from "@/lib/browse";
import { SEARCH_QUERY_MAX_LENGTH } from "@/lib/resource-types";

/**
 * The search field.
 *
 * A real `<form>` with `onSubmit` rather than a controlled input that navigates on
 * every keystroke, because two things depend on the native behaviour: Enter
 * submits without JavaScript wiring up a key handler, and the browser's own
 * "search this page" affordances work. Navigation is `router.push` so the result
 * is a client-side transition that the route's `loading.tsx` can stream, rather
 * than a full document load.
 *
 * It navigates rather than filtering in place. Results live at `/browse` with the
 * full set of controls, which means a search is a URL — shareable, linkable, and
 * the back button works. That is also why this is a box with a button in it
 * rather than a typeahead: the typeahead is a follow-up, and it will be layered
 * on top of this rather than replacing it.
 *
 * `carry` holds the filters that should survive a new search — the tag, type and
 * access level somebody had already narrowed to. Without it, searching from
 * inside a filtered view silently discards the filter, which is the kind of thing
 * nobody notices until they have lost their place.
 *
 * **`sort` is deliberately not carried.** Those three narrow *which* resources are
 * in scope and a new search is still inside that scope, whereas `sort` decides
 * *how* to order them and the right order for a new query is usually relevance.
 * Keeping a title sort across a fresh search would show the matches alphabetically
 * because of a choice made for a different question. The control on `/browse`
 * shows the ordering it settled on, and choosing a different one there is one
 * click.
 */
export function SearchBox({
  defaultValue = "",
  carry,
  id = "search",
  /** Announced to screen readers and used as the placeholder's short form. */
  label = "Search resources",
}: {
  defaultValue?: string;
  carry?: Omit<BrowseParams, "q">;
  id?: string;
  label?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(browseHref({ ...carry, q: value }));
  }

  return (
    /*
     * `<search>` rather than `role="search"` on the form: it is the landmark
     * element for this, and it wraps the `<form>` instead of replacing it, so the
     * native submit behaviour below is untouched. Named, because a landmark with
     * no name is announced only as "search" with nothing to distinguish it.
     */
    <search aria-label={label}>
      <form onSubmit={onSubmit}>
        {/*
          `ui/input.tsx` is the vendored *field* style — `border-b-input px-0`, a
          bottom rule with no box. Used bare it reads as an underlined caption
          rather than as a search field, so the frame is composed here and the
          input's own borders are switched off. The vendored file is not edited;
          varying a component through `className` is the normal shadcn way.
        */}
        <div className="flex items-center gap-2 rounded-md border border-border px-3 transition-colors focus-within:border-ring">
          <SearchIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />

          {/*
            `sr-only` rather than relying on the placeholder alone: a placeholder
            disappears the moment anything is typed, so it would be the only label
            the field ever had.
          */}
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
          <Input
            id={id}
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search titles, tags and reasons"
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            className="flex-1 border-0 px-0 focus-visible:border-0"
          />

          <Button type="submit" size="sm" variant="ghost">
            Search
          </Button>
        </div>
      </form>
    </search>
  );
}
