"use client";

import { useRouter } from "next/navigation";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ANY,
  type BrowseParams,
  browseHref,
  chosen,
  RELEVANCE,
  sortOptions,
} from "@/lib/browse";
import {
  ACCESS_TYPE_LABELS,
  ACCESS_TYPES,
  type AccessType,
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPES,
  type ResourceSort,
  type ResourceType,
} from "@/lib/resource-types";

/**
 * Type, access level and ordering, as three selects.
 *
 * Every control rewrites the URL rather than filtering a list it already holds.
 * That is what makes a filtered view shareable and the back button work, and it
 * means there is no client-side copy of the result set that can fall out of step
 * with the controls — the Server Component re-reads on every navigation and the
 * feed underneath remounts with the new page one.
 *
 * **Changes apply immediately.** That is the right behaviour where there is room
 * for the row, but it does not fit a phone — three full-width selects push the
 * results off-screen. `FilterSheet` is the mobile path and stages changes behind
 * an explicit "Show results" instead; the two share every value list and sentinel
 * from `@/lib/browse` so they cannot drift, and only this one's chrome is its own.
 *
 * `ui/select.tsx` is the vendored field style — bottom rule, no box — which is
 * right here: these sit in a row under the search field and match it.
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

  // Relevance is only a choice when there is something to be relevant to. With no
  // `q` it would mean nothing, and offering it would be offering a no-op.
  const hasQuery = Boolean(carry?.q);

  function apply(next: Partial<BrowseParams>) {
    router.push(browseHref({ ...carry, ...next }));
  }

  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <Field className="w-40">
        <FieldLabel htmlFor="filter-type">Type</FieldLabel>
        <Select
          value={type ?? ANY}
          onValueChange={(value) =>
            apply({ type: chosen<ResourceType>(value) })
          }
        >
          <SelectTrigger id="filter-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any type</SelectItem>
            {RESOURCE_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {RESOURCE_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field className="w-40">
        <FieldLabel htmlFor="filter-access">Access</FieldLabel>
        <Select
          value={accessType ?? ANY}
          onValueChange={(value) =>
            apply({ accessType: chosen<AccessType>(value) })
          }
        >
          <SelectTrigger id="filter-access" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any</SelectItem>
            {ACCESS_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {ACCESS_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field className="w-44">
        {/*
          Labelled "Sort" rather than named after the current value, because with
          a `q` and no `sort` the order is relevance — which is none of the three
          values below. A control that could not express the order the results are
          actually in would be quietly lying about it, so relevance is a real
          option that clears `sort` rather than a fourth backend value. With no
          search there is nothing to be relevant to, so it is not offered.
        */}
        <FieldLabel htmlFor="filter-sort">Sort</FieldLabel>
        <Select
          value={sort ?? (hasQuery ? RELEVANCE : "newest")}
          onValueChange={(value) =>
            apply({ sort: chosen<ResourceSort>(value) })
          }
        >
          <SelectTrigger id="filter-sort" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions(hasQuery).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
