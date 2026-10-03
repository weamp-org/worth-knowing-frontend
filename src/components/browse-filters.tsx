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
import { type BrowseParams, browseHref } from "@/lib/browse";
import {
  ACCESS_TYPE_LABELS,
  ACCESS_TYPES,
  type AccessType,
  RESOURCE_SORT_LABELS,
  RESOURCE_SORTS,
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPES,
  type ResourceSort,
  type ResourceType,
} from "@/lib/resource-types";

/**
 * Sentinels for two choices that are real options but not backend values.
 *
 * **Relevance** — the backend models it as the *absence* of `sort`. There is no
 * `sort=relevance`, and sending one is a 400, so choosing it clears `sort`.
 *
 * **Any** — Radix has no "no value selected" item: `SelectValue`'s placeholder is
 * not clickable, and re-picking the current item does not deselect it. Without an
 * explicit item, choosing a type is a one-way door — the only ways back would be
 * editing the URL or the "Clear everything" link, which is not how a filter is
 * meant to work.
 *
 * Neither can be an empty string: Radix reads that as "nothing selected" and
 * renders the placeholder instead of the chosen item.
 */
const RELEVANCE = "__relevance";
const ANY = "__any";

/** Maps a chosen option back to the parameter it stands for. */
function chosen<T extends string>(value: string): T | undefined {
  if (!value || value === ANY || value === RELEVANCE) return undefined;
  return value as T;
}

/**
 * Type, access level and ordering, as three selects.
 *
 * Every control rewrites the URL rather than filtering a list it already holds.
 * That is what makes a filtered view shareable and the back button work, and it
 * means there is no client-side copy of the result set to fall out of step with
 * the controls — the Server Component re-reads on every navigation and the feed
 * underneath remounts with the new page one.
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
            {hasQuery ? (
              <SelectItem value={RELEVANCE}>Relevance</SelectItem>
            ) : null}
            {RESOURCE_SORTS.map((value) => (
              <SelectItem key={value} value={value}>
                {RESOURCE_SORT_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
