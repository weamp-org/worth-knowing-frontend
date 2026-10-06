"use client";

import { useEffect, useRef } from "react";

import { trackSearchPerformed } from "@/lib/analytics";

/**
 * Fires `search_performed` once per committed search-results render.
 *
 * Mounted by `/browse` only when the parsed URL carries a query, keyed on the
 * full filter URL so each committed search counts once. The raw query text is
 * used here only to measure its length bucket — it is never forwarded. The
 * typeahead's debounced lookups never mount this, so keystrokes stay untracked.
 */
export function SearchPerformedTracker({
  queryLength,
  hasTagFilter,
  hasTypeFilter,
  hasAccessFilter,
  resultCount,
  sort,
  isAuthenticated,
  dedupeKey,
}: {
  /** Length of the trimmed query. The text itself is never passed along. */
  queryLength: number;
  hasTagFilter: boolean;
  hasTypeFilter: boolean;
  hasAccessFilter: boolean;
  /** Whole-result total from the listing facets, not the page size. */
  resultCount: number;
  sort: string;
  isAuthenticated: boolean;
  /** The committed filter URL. One render of one URL is one search. */
  dedupeKey: string;
}) {
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (firedFor.current === dedupeKey) return;
    firedFor.current = dedupeKey;
    trackSearchPerformed({
      queryLength,
      hasTagFilter,
      hasTypeFilter,
      hasAccessFilter,
      resultCount,
      sort,
      isAuthenticated,
    });
  }, [
    dedupeKey,
    queryLength,
    hasTagFilter,
    hasTypeFilter,
    hasAccessFilter,
    resultCount,
    sort,
    isAuthenticated,
  ]);

  return null;
}
