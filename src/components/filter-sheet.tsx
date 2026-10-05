"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
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
 * The staged copy of the three filters, before Apply.
 *
 * Every field holds the **control's own option value**, sentinel included — not
 * the parameter it stands for. That indirection is what makes Reset correct: the
 * sort control defaults to `newest`, or to relevance when a search is active, and
 * holding the resolved parameter instead would leave Reset unable to express
 * "back to relevance", because the parameter for that is nothing at all.
 */
interface Draft {
  type: string;
  accessType: string;
  sort: string;
}

/**
 * The same bottom-rule treatment as the vendored `ui/input.tsx`, on a native
 * `<select>`.
 *
 * Native rather than Radix on purpose, and it is a trade rather than a shortcut.
 * On a phone the OS picker is the right control for this — a real touch target,
 * a wheel on iOS, the platform's own styling — and it avoids a Radix `Select`
 * opening a portalled dropdown from inside a modal `Dialog`, which is a
 * focus-trap interaction nobody can confirm without a device in hand. The native
 * chevron is deliberately kept: `appearance-none` would strip it and leave a
 * bottom rule with no hint that it opens anything.
 *
 * Every *value* still comes from `@/lib/resource-types`, so the two controls
 * cannot offer different options.
 */
const SELECT_CLASS =
  "h-10 w-full border-0 border-b border-b-input bg-transparent px-0 text-sm outline-none focus-visible:border-b-ring";

/**
 * The filters, behind a trigger, on small screens.
 *
 * Two things differ from the inline `BrowseFilters`, and both are because of the
 * viewport:
 *
 * **Staged rather than immediate.** Three full-width selects stacked into a
 * phone's width push the results below the fold, so applying each change as it is
 * made means the list jumps on every pick. Here the draft is held until "Show
 * results", and dismissing without pressing it throws the draft away.
 *
 * **A bottom sheet rather than a dialog or a drawer.** A centred dialog on a
 * phone covers the thing it is filtering; a side drawer covers the screen and
 * lands on the wrong edge for a thumb. The sheet is `DialogContent` re-anchored,
 * so there is no new primitive and no new dependency — `ui/dialog.tsx` is
 * composed, never edited.
 */
export function FilterSheet({
  type,
  accessType,
  sort,
  carry,
}: {
  type?: ResourceType;
  accessType?: AccessType;
  sort?: ResourceSort;
  carry?: Omit<BrowseParams, "type" | "accessType" | "sort">;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    type: "",
    accessType: "",
    sort: "",
  });

  const hasQuery = Boolean(carry?.q);

  /** What the controls should show when opened: what is applied right now. */
  const applied = (): Draft => ({
    type: type ?? ANY,
    accessType: accessType ?? ANY,
    sort: sort ?? (hasQuery ? RELEVANCE : "newest"),
  });

  /** What Reset returns to: no filters, and the ordering nobody chose. */
  const cleared = (): Draft => ({
    type: ANY,
    accessType: ANY,
    sort: hasQuery ? RELEVANCE : "newest",
  });

  /*
   * Re-seed on open rather than on prop change.
   *
   * An effect would mean the sheet briefly renders the previous draft's values
   * before correcting itself, and would fight the user mid-edit if the URL
   * changed underneath them. Seeding at the moment of opening is simpler and
   * honest: what you see when it opens is what was applied when you left.
   */
  function handleOpenChange(next: boolean) {
    if (next) setDraft(applied());
    setOpen(next);
  }

  function apply() {
    /*
     * The ordering the controls default to is omitted rather than sent. With no
     * search that keeps `sort=newest` out of every unfiltered URL; with a search
     * it is what keeps relevance from being written as an explicit `sort=newest`
     * by a Reset. An ordering the person *did* pick still goes in, because it
     * differs from the default — that is the case `?q=…&sort=title`.
     */
    const defaultSort = hasQuery ? undefined : "newest";
    const chosenSort = chosen<ResourceSort>(draft.sort);

    router.push(
      browseHref({
        ...carry,
        type: chosen<ResourceType>(draft.type),
        accessType: chosen<AccessType>(draft.accessType),
        sort: chosenSort === defaultSort ? undefined : chosenSort,
      }),
    );
    setOpen(false);
  }

  /**
   * How many filters are live, so the trigger can say so.
   *
   * A count rather than a dot: three are possible, and "Filters (2)" says there
   * is something to undo without opening anything to find out.
   */
  const activeCount = [type, accessType, sort].filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <SlidersHorizontalIcon aria-hidden="true" />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </DialogTrigger>

      {/*
        Re-anchoring `DialogContent` to the bottom edge. Each override has to
        name the specific property it is undoing rather than a shorthand, because
        `inset-x-0` and `left-1/2` are not reliably recognised as conflicting by
        the class merge and both would land in the attribute. `rounded-none` is
        left alone to match the rest of the app, and `sm:max-w-md` needs its own
        `sm:` override for the same reason.
      */}
      <DialogContent className="left-0 top-auto bottom-0 max-w-none translate-x-0 translate-y-0 gap-0 p-0 sm:max-w-none">
        <DialogHeader className="border-b border-border p-4 pb-3">
          <DialogTitle>Filters</DialogTitle>
          <DialogDescription>
            {hasQuery
              ? "Narrowing what the search matched."
              : "Narrowing everything shared here."}
          </DialogDescription>
        </DialogHeader>

        {/*
          Bounded and scrollable rather than allowed to grow. With a software
          keyboard open the visible area can be a few hundred pixels, and a sheet
          that outgrows the screen takes its own Apply button with it.
          `dvh` so it tracks that shrinking viewport rather than the layout one.
        */}
        <div className="max-h-[60dvh] overflow-y-auto p-4">
          <div className="flex flex-col gap-5">
            <div>
              <FieldLabel htmlFor="sheet-type">Type</FieldLabel>
              <select
                id="sheet-type"
                className={SELECT_CLASS}
                value={draft.type}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
              >
                <option value={ANY}>Any type</option>
                {RESOURCE_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {RESOURCE_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="sheet-access">Access</FieldLabel>
              <select
                id="sheet-access"
                className={SELECT_CLASS}
                value={draft.accessType}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    accessType: event.target.value,
                  }))
                }
              >
                <option value={ANY}>Any</option>
                {ACCESS_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {ACCESS_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="sheet-sort">Sort</FieldLabel>
              <select
                id="sheet-sort"
                className={SELECT_CLASS}
                value={draft.sort}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    sort: event.target.value,
                  }))
                }
              >
                {sortOptions(hasQuery).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/*
          Apply is a plain button rather than a `DialogClose`, because that would
          discard the draft along with the panel. It navigates, and the navigation
          is what closes the sheet. Cancel is the real `DialogClose`.
        */}
        <DialogFooter className="flex-row gap-2 border-t border-border p-4">
          <Button
            variant="ghost"
            className="mr-auto"
            onClick={() => setDraft(cleared())}
            disabled={
              draft.type === ANY &&
              draft.accessType === ANY &&
              draft.sort === (hasQuery ? RELEVANCE : "newest")
            }
          >
            Reset
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={apply}>Show results</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
