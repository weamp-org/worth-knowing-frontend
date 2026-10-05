"use client";

import { useRouter } from "next/navigation";

import { FilterSelect } from "@/components/filter-select";
import {
  ANY,
  accessOptions,
  type BrowseParams,
  browseHref,
  chosen,
  RELEVANCE,
  sortOptions,
  typeOptions,
} from "@/lib/browse";
import type {
  AccessType,
  ResourceSort,
  ResourceType,
} from "@/lib/resource-types";

/**
 * Type, access level and ordering, as three selects in a row.
 *
 * Every control rewrites the URL rather than filtering a list it already holds.
 * That is what makes a filtered view shareable and the back button work, and it
 * means there is no client-side copy of the result set that can fall out of step
 * with the controls — the Server Component re-reads on every navigation and the
 * feed underneath remounts with the new page one.
 *
 * **Changes apply immediately.** That is the right behaviour where there is room
 * for the row: picking a filter is one interaction rather than three. It does not
 * fit a phone, where `FilterSheet` stages the same changes behind an explicit
 * "Show results". Both render {@link FilterSelect} and read their options from
 * `@/lib/browse`, so the two layouts cannot drift.
 *
 * Relevance is the control's value when a search is active and no `sort` is set —
 * see `RELEVANCE` in `@/lib/browse` for why it is not a `sort` value.
 */
export function BrowseFilters({
  type,
  accessType,
  sort,
  /** Whatever else is active, so changing one control does not clear the rest. */
  carry,
}: {
  type?: ResourceType;
  accessType?: AccessType;
  sort?: ResourceSort;
  carry?: Omit<BrowseParams, "type" | "accessType" | "sort">;
}) {
  const router = useRouter();

  const hasQuery = Boolean(carry?.q);

  function apply(next: Partial<BrowseParams>) {
    router.push(browseHref({ ...carry, ...next }));
  }

  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <FilterSelect
        id="filter-type"
        label="Type"
        className="w-40"
        value={type ?? ANY}
        options={typeOptions()}
        onChange={(value) => apply({ type: chosen<ResourceType>(value) })}
      />

      <FilterSelect
        id="filter-access"
        label="Access"
        className="w-40"
        value={accessType ?? ANY}
        options={accessOptions()}
        onChange={(value) => apply({ accessType: chosen<AccessType>(value) })}
      />

      <FilterSelect
        id="filter-sort"
        label="Sort"
        className="w-44"
        value={sort ?? (hasQuery ? RELEVANCE : "newest")}
        options={sortOptions(hasQuery)}
        onChange={(value) => apply({ sort: chosen<ResourceSort>(value) })}
      />
    </div>
  );
}
