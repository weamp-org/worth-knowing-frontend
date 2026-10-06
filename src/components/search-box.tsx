"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setDiscoverySource } from "@/lib/analytics";
import { type BrowseParams, browseHref } from "@/lib/browse";
import {
  RESOURCE_TYPE_LABELS,
  type Resource,
  SEARCH_QUERY_MAX_LENGTH,
} from "@/lib/resource-types";
import { listResources } from "@/lib/resources-api";

/**
 * How long typing has to pause before a lookup is sent.
 *
 * Deliberately **not** the 200ms `TagInput` uses, though the two suggestion lists
 * ought to feel like siblings. They are answering different questions. A tag is a
 * short controlled vocabulary you are confirming an exact name for, so the answer
 * is worth having immediately. Search is exploratory — you type, misjudge,
 * backspace, revise — and every pause longer than this is another request to a
 * backend that allows 100 a minute for *everyone behind the same IP address*.
 *
 * Requests only fire once typing has stopped for this long, so raising it is the
 * cheapest way to send materially fewer of them. 300ms is where suggestions stop
 * feeling like they are keeping up. If it reads as laggy on a real machine,
 * 250ms is the compromise to take rather than going back to a request per pause.
 */
const SUGGEST_DELAY_MS = 300;

/** Rows offered at once. More than this is a scrollbar, not a suggestion list. */
const SUGGEST_LIMIT = 8;

/**
 * Shortest query that looks anything up.
 *
 * Three, and not for the interface's sake: this is where the backend's fuzzy
 * matching becomes available at all, because `word_similarity` needs three
 * characters to have a trigram to work with. Below that a needle degenerates into
 * `ILIKE '%a%'` over the whole corpus — slow, and matching most of the site, so
 * it is noise rather than help. Asking for three also skips the first request or
 * two of every single search.
 */
const MIN_SUGGEST_LENGTH = 3;

/**
 * "No row highlighted."
 *
 * A distinct state rather than a default of `0`, and it is what keeps Enter
 * meaning two different things: with a row highlighted, Enter goes to that row;
 * with nothing highlighted, Enter falls through and submits the form. Had this
 * started at `0`, the very first Enter on an open dropdown would jump straight to
 * a resource and the full search would need a second press — the exact
 * "selects the wrong thing" behaviour that makes a typeahead untrustworthy.
 */
const NO_HIGHLIGHT = -1;

const OPTION_CLASS =
  "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent";

function optionClass(isHighlighted: boolean): string {
  return isHighlighted ? `${OPTION_CLASS} bg-accent` : OPTION_CLASS;
}

/**
 * Returns `value` only once it has stopped changing for `delay` ms.
 *
 * Plain state and an effect rather than a debounce hook: there is no `use-debounce`
 * dependency here, and this is the whole of it. `value` resets to `""` when the
 * caller clears the field, so the effect has to cope with going backwards as well
 * as forwards — hence the guard, without which a cleared box would keep the last
 * query's suggestions and never send the shorter one.
 */
function useDebouncedValue(value: string, delay: number): string {
  const [settled, setSettled] = useState(value);

  // Keyed on `value` alone. When the timer fires, `settled` takes the value it
  // was already waiting for, so there is nothing to re-run — and deliberately not
  // keyed on `settled`, which would make the effect its own dependency and reset
  // the timer every time it landed. Clearing the field moves the other way, back
  // to `""`, and that is handled by the same effect rather than needing a guard.
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}

/**
 * The search field, with a typeahead over `GET /resources?q=`.
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
 * the back button works.
 *
 * ## The typeahead layers on top of that rather than replacing it
 *
 * The dropdown is an accelerator for "I already know roughly what I want", and it
 * is entirely additive: the form, the submit button, Enter-with-nothing-highlighted
 * and the browser's own affordances all behave exactly as they did before it
 * existed. **A failed or slow suggestion lookup degrades to the plain form**, which
 * is why the fetch swallows its errors rather than surfacing them — free text has
 * always worked and a network blip must not turn it into a dead end.
 *
 * Two destinations, because the two intents are genuinely different and it is
 * cheap to serve both:
 *
 * - **A highlighted row** goes to `/resources/:id`. Somebody who has just read
 *   "Sapiens: A Brief History of Humankind" in the list wants that page, not a
 *   list of it.
 * - **A bare Enter** runs the search and lands on `/browse?q=`, with the filters
 *   already in scope. Somebody who typed a half-formed query wants to see what
 *   else matches.
 *
 * The trailing "See all results" row exists so the second of those is one click
 * rather than a keyboard-only path.
 *
 * ## Reuses `GET /resources` unchanged
 *
 * The dropdown is the ordinary ranked search with a smaller page size, so there is
 * no new endpoint and the ranking — exact title, prefix, tag, substring, fuzzy,
 * then `why` — is the same one `/browse` shows. The cost of that choice is that
 * each request ships up to eight *whole* resources, contributor join and `why`
 * included. That is a payload problem, not a rate one, and it is worth revisiting
 * only if it actually shows up.
 *
 * Redaction comes along for free: `listResources` is the same call the feed makes,
 * so an anonymous contribution arrives here already stripped of its contributor. A
 * narrower endpoint would have to earn that deliberately.
 *
 * ## Why this goes through TanStack Query rather than an effect
 *
 * Because search gets revised, and an effect cannot know what it already asked
 * for. Someone who types `mach`, backspaces to `mac` and fixes it should not spend
 * a second request on an answer the backend has already given — and the case is
 * common enough in search specifically that it is worth a shared cache. Tags
 * mostly get typed once and confirmed, which is why `TagInput` can get away with a
 * bare `setTimeout` and this cannot.
 *
 * It also means going back over ground already covered fills in instantly, with no
 * spinner, because the answer is already in hand. The provider's 30s `staleTime`
 * is exactly the window that describes; nothing is overridden here.
 *
 * ## Keyboard
 *
 * Arrows move and wrap, Enter picks the highlighted row, Escape closes, and the
 * input keeps focus throughout — the list is pointed at with
 * `aria-activedescendant` and its rows are deliberately not focusable, so Tab
 * leaves the field instead of walking into the options.
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
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(NO_HIGHLIGHT);
  const [highlightedFor, setHighlightedFor] = useState("");

  const trimmed = value.trim();
  const shouldSuggest = trimmed.length >= MIN_SUGGEST_LENGTH;

  // The debounced query is what is actually looked up; `trimmed` is what the form
  // submits. Keeping them apart is why submitting never waits out the debounce.
  const debounced = useDebouncedValue(trimmed, SUGGEST_DELAY_MS).trim();
  const canSuggest = debounced.length >= MIN_SUGGEST_LENGTH;

  const { data } = useQuery({
    queryKey: ["resource-suggestions", debounced],
    queryFn: ({ signal }) =>
      listResources({ q: debounced, limit: SUGGEST_LIMIT }, signal),
    // Never for the empty string: the backend answers a blank `q` with the whole
    // feed, which is a 100k-row request behind a dropdown.
    enabled: canSuggest,
  });

  /*
   * Read through the debounced query rather than trusting `data` directly.
   *
   * TanStack Query keeps the previous page's data visible while a new key
   * resolves, which is right for most of this app and wrong here: it would show
   * suggestions for `mach` under a box that now says `machine`. A stale list is
   * better than a flashing one, but it is actively misleading when the thing
   * being typed is the thing the list is supposed to answer.
   */
  const matches: Resource[] =
    data && canSuggest && debounced.length > 0 ? data.items : [];

  /*
   * One past the last suggestion, for the trailing "See all results" row.
   *
   * The row count is what makes Enter's two meanings unambiguous, so it is
   * computed once and both the keyboard and `aria-activedescendant` read it.
   */
  const rowCount = matches.length + 1;
  const seeAllIndex = matches.length;

  /*
   * Resetting the highlight when the query changes, done during render rather than
   * in an effect, for `TagInput`'s reason: React re-renders immediately without
   * committing, so there is no frame where a stale highlight is painted against
   * new results.
   *
   * Reset to `NO_HIGHLIGHT` rather than `0` — see the constant's note. Clearing the
   * highlight is what lets a bare Enter mean "run the search" again as soon as the
   * query changes.
   */
  if (highlightedFor !== trimmed) {
    setHighlightedFor(trimmed);
    setHighlighted(NO_HIGHLIGHT);
  }

  /** Clears the list so a stale dropdown cannot outlive the thing that opened it. */
  function closeSuggestions() {
    setIsOpen(false);
    setHighlighted(NO_HIGHLIGHT);
  }

  function runSearch() {
    closeSuggestions();
    router.push(browseHref({ ...carry, q: trimmed }));
  }

  function openResource(resourceId: string) {
    closeSuggestions();
    // A suggestion pick leads straight to the resource, bypassing `/browse`,
    // so the attribution is recorded here rather than by a listing.
    setDiscoverySource("search");
    // Leave the text in the box. `/browse` keys on `q` and will remount anyway,
    // and on a route that does not remount it, a box still showing the query that
    // led here is right rather than a stale suggestion list sitting under it.
    router.push(`/resources/${encodeURIComponent(resourceId)}`);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (rowCount <= 1) return;

      // Prevented so the caret does not jump to the start or end of the field.
      event.preventDefault();
      setIsOpen(true);
      setHighlighted((current) => {
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;
        if (next < 0) return rowCount - 1;
        if (next >= rowCount) return 0;
        return next;
      });
      return;
    }

    if (event.key === "Enter") {
      /*
       * The whole reason this dropdown can coexist with a form.
       *
       * With a row highlighted, Enter belongs to the list and the form must not
       * also fire. With nothing highlighted — the state right after typing, and
       * after every query change — Enter belongs to the form, so it is left alone
       * and the native submit runs. `preventDefault()` in the unconditional form
       * would make the first Enter on a fresh query jump somewhere the person had
       * not chosen.
       */
      if (!isOpen || highlighted < 0 || highlighted >= rowCount) return;

      event.preventDefault();

      if (highlighted === seeAllIndex) {
        runSearch();
      } else {
        openResource(matches[highlighted].id);
      }
      return;
    }

    if (event.key === "Escape" && isOpen) {
      // Stops the browser's own "clear this search field" handling from also
      // firing, which would reset `value` and reopen the lookup.
      event.preventDefault();
      setIsOpen(false);
      setHighlighted(NO_HIGHLIGHT);
    }
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
        {/* `relative` anchors the list below the field rather than pushing the
            page down as suggestions arrive. */}
        <div className="relative">
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
              /*
               * The combobox role goes on the input itself, per ARIA 1.2, and the
               * popup hangs off `aria-controls`. Focus never enters the list, so
               * `aria-activedescendant` is what tells assistive technology which
               * row the arrows are on.
               */
              role="combobox"
              aria-expanded={isOpen && rowCount > 1}
              aria-controls={`${id}-listbox`}
              aria-autocomplete="list"
              aria-activedescendant={
                isOpen && highlighted >= 0
                  ? `${id}-option-${highlighted}`
                  : undefined
              }
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                // Typing reopens a list that Escape or a previous pick closed,
                // which is what makes the dropdown feel like it is still listening.
                if (shouldSuggest) setIsOpen(true);
              }}
              onFocus={() => shouldSuggest && setIsOpen(true)}
              onBlur={closeSuggestions}
              onKeyDown={onKeyDown}
              placeholder="Search titles, tags and reasons"
              maxLength={SEARCH_QUERY_MAX_LENGTH}
              className="flex-1 border-0 px-0 focus-visible:border-0"
            />

            <Button type="submit" size="sm" variant="ghost">
              Search
            </Button>
          </div>

          {isOpen && rowCount > 1 ? (
            /*
             * `div` roles rather than `ul`/`li`: the ARIA listbox pattern is
             * right, but a `ul` carrying an interactive role is invalid
             * semantics. Mirrors `TagInput`, so the two suggestion lists in this
             * app behave and read identically.
             */
            <div
              id={`${id}-listbox`}
              role="listbox"
              aria-label="Suggested resources"
              className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
            >
              {matches.map((resource, index) => (
                <div
                  key={resource.id}
                  id={`${id}-option-${index}`}
                  role="option"
                  // -1, not 0: the options must not become tab stops, or Tab would
                  // walk into the list and abandon the field. It still allows
                  // programmatic focus for `aria-activedescendant`.
                  tabIndex={-1}
                  aria-selected={highlighted === index}
                  // `onMouseDown` rather than `onClick`: the input's blur would
                  // close the list before a click landed.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    openResource(resource.id);
                  }}
                  onMouseEnter={() => setHighlighted(index)}
                  className={optionClass(highlighted === index)}
                >
                  <span className="truncate">{resource.title}</span>
                  {/*
                    The type, because two results with similar titles are
                    different things and the field says nothing about which is
                    which. Plain text rather than `Badge`: `Badge` is 10px
                    uppercase tracked-out label styling, which is too loud at this
                    size and reads as a status rather than as a kind of thing.
                  */}
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {RESOURCE_TYPE_LABELS[resource.type]}
                  </span>
                </div>
              ))}

              {/*
                The escape hatch. Everything above is "go to the thing I picked";
                this is "show me everything", which is what the person wanted all
                along if they kept typing. Same destination as a bare Enter, so
                the two are interchangeable rather than two subtly different paths.
              */}
              <div
                id={`${id}-option-${seeAllIndex}`}
                role="option"
                tabIndex={-1}
                aria-selected={highlighted === seeAllIndex}
                onMouseDown={(event) => {
                  event.preventDefault();
                  runSearch();
                }}
                onMouseEnter={() => setHighlighted(seeAllIndex)}
                className={`${optionClass(highlighted === seeAllIndex)} mt-1 border-t border-border pt-1.5`}
              >
                <ArrowRightIcon className="shrink-0 text-muted-foreground" />
                <span className="truncate">See all results</span>
              </div>
            </div>
          ) : null}
        </div>
      </form>
    </search>
  );
}
