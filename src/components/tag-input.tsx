"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { TagBadge } from "@/components/tag-badge";
import { Input } from "@/components/ui/input";
import type { TagSearchResult } from "@/lib/resource-types";
import { MAX_TAG_LENGTH } from "@/lib/resource-types";
import { listAllTags } from "@/lib/resources-api";
import {
  isUnsupportedScript,
  isUsableTagSlug,
  slugifyTag,
} from "@/lib/tag-slug";

/**
 * How many suggestions the dropdown shows.
 *
 * Matches the backend's old server-side cap, so switching the filtering
 * client-side changes the latency but not the shape of the list.
 */
const MAX_SUGGESTIONS = 20;

const OPTION_CLASS =
  "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent";

function optionClass(isHighlighted: boolean): string {
  return isHighlighted ? `${OPTION_CLASS} bg-accent` : OPTION_CLASS;
}

/**
 * Tags as removable chips plus a text box backed by the tag typeahead.
 *
 * Suggestions come from `GET /tags`, which is what the backend built this for.
 * Selecting one takes the canonical name, so an existing tag is reused instead
 * of creating a near-duplicate of it.
 *
 * The whole vocabulary is fetched once on mount and filtered locally, rather
 * than queried per keystroke behind a debounce. The table is tiny (dozens of
 * rows) and grows by at most five per contribution, so one small request
 * replaces a network round trip after every pause — which is the delay the
 * old shape had, and no debounce tuning could remove. The backend order is
 * kept, so suggestions still rank most-used first. A failed fetch degrades to
 * the create row, the same fallback a failed lookup always had.
 */
export function TagInput({
  id,
  value,
  onChange,
  invalid,
  maxTags,
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  invalid: boolean;
  maxTags: number;
}) {
  const [draft, setDraft] = useState("");
  const [vocabulary, setVocabulary] = useState<TagSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [highlightedFor, setHighlightedFor] = useState("");

  const isFull = value.length >= maxTags;
  const trimmed = draft.trim();

  // One fetch for the component's lifetime. The share page mounts this fresh
  // on every visit, so there is no staleness worth refetching over — and a
  // tag coined elsewhere mid-form is still creatable via the create row.
  useEffect(() => {
    let cancelled = false;

    listAllTags()
      .then((rows) => {
        if (!cancelled) setVocabulary(rows);
      })
      .catch(() => {
        if (!cancelled) setVocabulary([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered during render, not fetched: the vocabulary is already here, so
  // suggestions track the keystroke with no debounce and no round trip. The
  // match covers slugs too, mirroring the backend's old substring search — a
  // contributor who has seen `machine-learning` in a URL types that.
  const needle = slugifyTag(trimmed);
  const suggestions =
    trimmed.length === 0 || isFull
      ? []
      : vocabulary
          .filter(
            (tag) =>
              tag.slug.includes(needle) &&
              !value.some((selected) => slugifyTag(selected) === tag.slug),
          )
          .slice(0, MAX_SUGGESTIONS);

  /**
   * Whether the draft is something new rather than one of the suggestions.
   * Drives the "create this" row and stops Enter re-adding a match.
   */
  const isNewTag =
    trimmed.length > 0 &&
    !suggestions.some((m) => m.slug === slugifyTag(trimmed));
  const previewSlug = slugifyTag(trimmed);
  const previewIsUnusable = isUnsupportedScript(trimmed);
  const showCreateRow =
    isNewTag && !previewIsUnusable && isUsableTagSlug(previewSlug);

  const rowCount = suggestions.length + (showCreateRow ? 1 : 0);

  // Resetting the highlight when the query changes, done during render rather
  // than in an effect: React re-renders immediately without committing, so
  // there is no frame where a stale highlight is painted against new results.
  if (highlightedFor !== trimmed) {
    setHighlightedFor(trimmed);
    setHighlighted(0);
  }

  function addTag(tag: string) {
    if (!tag || isFull) return;

    // Compared on the slug, not the raw string: the backend folds accents, so
    // "Café" and "cafe" are the same tag. A plain case-insensitive comparison
    // let both through and the backend then silently dropped one.
    const slug = slugifyTag(tag);
    if (value.some((existing) => slugifyTag(existing) === slug)) return;

    onChange([...value, tag]);
    setDraft("");
    setIsOpen(false);
  }

  function selectHighlighted() {
    if (!isOpen || rowCount === 0) return;

    if (highlighted < suggestions.length) {
      addTag(suggestions[highlighted].name);
      return;
    }

    if (showCreateRow) addTag(trimmed);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (rowCount === 0) return;
      event.preventDefault();
      setIsOpen(true);
      setHighlighted((current) => {
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;
        // Wraps, so holding the key does not dead-end at either end.
        return (next + rowCount) % rowCount;
      });
      return;
    }

    if (event.key === "Enter") {
      // Otherwise the first Enter submits the whole form.
      event.preventDefault();
      selectHighlighted();
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
      return;
    }

    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <ul className="flex flex-wrap items-center gap-2">
          {value.map((tag) => (
            <li key={tag}>
              {/* The chip is the shared one, so a tag looks like a tag here as it
                  does everywhere else. The button needs room the read-only chips
                  do not, hence the extra right padding. */}
              <TagBadge
                tag={{ name: tag, slug: tag }}
                className="gap-1 pr-1 pl-2"
              >
                <button
                  type="button"
                  onClick={() =>
                    onChange(value.filter((other) => other !== tag))
                  }
                  aria-label={`Remove tag ${tag}`}
                  className="p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <XIcon />
                </button>
              </TagBadge>
            </li>
          ))}
        </ul>
      ) : null}

      {/* `relative` anchors the list below the input rather than pushing the
          form down as matches arrive. */}
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={isOpen && rowCount > 0}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && rowCount > 0 ? `${id}-option-${highlighted}` : undefined
          }
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            // The old shape opened the dropdown when results arrived over the
            // network; with local filtering there is no arrival, so typing
            // opens it directly. An empty draft still shows nothing — see the
            // `trimmed.length === 0` guard on the suggestions.
            setIsOpen(true);
          }}
          onFocus={() => trimmed && setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onKeyDown={onKeyDown}
          disabled={isFull}
          maxLength={MAX_TAG_LENGTH}
          aria-invalid={invalid}
          placeholder={
            isFull
              ? `Limit of ${maxTags} tags reached`
              : "Machine Learning, evolution"
          }
        />

        {isOpen && rowCount > 0 ? (
          // `div` roles rather than `ul`/`li`: the ARIA listbox pattern is
          // right, but a `ul` carrying an interactive role is invalid
          // semantics. Focus never enters this list — the input owns the
          // keyboard and points at the active row through
          // `aria-activedescendant` — so the options are deliberately not
          // focusable and none of them need to be a button.
          <div
            id={`${id}-listbox`}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          >
            {suggestions.map((match, index) => (
              <div
                key={match.id}
                id={`${id}-option-${index}`}
                role="option"
                // -1, not 0: the options must not become tab stops, or Tab
                // would walk into the list and abandon the input. It still
                // allows programmatic focus for anything following
                // `aria-activedescendant`.
                tabIndex={-1}
                aria-selected={highlighted === index}
                // `onMouseDown` rather than `onClick`: the input's blur would
                // close the list before a click landed.
                onMouseDown={(event) => {
                  event.preventDefault();
                  addTag(match.name);
                }}
                onMouseEnter={() => setHighlighted(index)}
                className={optionClass(highlighted === index)}
              >
                <span className="truncate">{match.name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                  {match.resourceCount}
                </span>
              </div>
            ))}

            {showCreateRow ? (
              <div
                id={`${id}-option-${suggestions.length}`}
                role="option"
                tabIndex={-1}
                aria-selected={highlighted === suggestions.length}
                onMouseDown={(event) => {
                  event.preventDefault();
                  addTag(trimmed);
                }}
                onMouseEnter={() => setHighlighted(suggestions.length)}
                className={optionClass(highlighted === suggestions.length)}
              >
                <PlusIcon className="shrink-0 text-muted-foreground" />
                <span className="truncate">
                  New tag{" "}
                  <span className="text-muted-foreground">/{previewSlug}</span>
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {trimmed && previewIsUnusable ? (
        <p className="text-xs text-destructive">
          {`"${trimmed}" uses a script that cannot become a tag URL yet.`}
        </p>
      ) : null}

      {trimmed &&
      !previewIsUnusable &&
      trimmed.length > 0 &&
      !isUsableTagSlug(previewSlug) ? (
        <p className="text-xs text-muted-foreground">
          A tag needs at least 2 letters or digits.
        </p>
      ) : null}
    </div>
  );
}
