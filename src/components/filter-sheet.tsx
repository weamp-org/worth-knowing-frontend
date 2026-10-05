"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FilterSelect } from "@/components/filter-select";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
 * The filters, behind a trigger, on small screens.
 *
 * Two things differ from the inline `BrowseFilters`, and both are because of the
 * viewport:
 *
 * **Staged rather than immediate.** Three full-width selects stacked into a
 * phone's width push the results below the fold, so applying each change as it is
 * made would make the list jump on every pick. Here the draft is held until "Show
 * results", and dismissing without pressing it throws the draft away.
 *
 * **A bottom sheet rather than a centred dialog.** A centred dialog covers the
 * thing it is filtering. `ui/sheet.tsx` is the vendored shadcn sheet, which is
 * `Dialog` with a `side` — so this is still one primitive and still no second UI
 * library, and none of the positioning is hand-written.
 *
 * The trigger is hidden at `sm` and the inline row below it, so exactly one is
 * ever visible. Both stay in the DOM, which is why this one's control ids are
 * prefixed rather than shared.
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

  /** What the controls show when opened: what is applied right now. */
  const applied = (): Draft => ({
    type: type ?? ANY,
    accessType: accessType ?? ANY,
    sort: sort ?? (hasQuery ? RELEVANCE : "newest"),
  });

  /** What Reset returns to: no filters, and an ordering nobody chose. */
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
     * search that keeps `sort=newest` out of every unfiltered URL; with a search it
     * is what stops a Reset writing `sort=newest` in place of relevance. An
     * ordering somebody *did* choose still goes in, because it differs from the
     * default — that is the `?q=…&sort=title` case.
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
   * A count rather than a dot: three are possible, and "Filters (2)" says there is
   * something to undo without opening anything to find out.
   */
  const activeCount = [type, accessType, sort].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <SlidersHorizontalIcon aria-hidden="true" />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            {hasQuery
              ? "Narrowing what the search matched."
              : "Narrowing everything shared here."}
          </SheetDescription>
        </SheetHeader>

        {/*
          `flex-1 overflow-y-auto` rather than a fixed height. `SheetContent` is a
          flex column sized to its own content, so the middle region takes the
          slack and only scrolls if the controls plus a software keyboard exceed
          what is left — which is what stops the footer carrying the Apply button
          off the bottom of the screen.
        */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-8">
          <FilterSelect
            id="sheet-type"
            label="Type"
            value={draft.type}
            options={typeOptions()}
            onChange={(value) =>
              setDraft((current) => ({ ...current, type: value }))
            }
          />

          <FilterSelect
            id="sheet-access"
            label="Access"
            value={draft.accessType}
            options={accessOptions()}
            onChange={(value) =>
              setDraft((current) => ({ ...current, accessType: value }))
            }
          />

          <FilterSelect
            id="sheet-sort"
            label="Sort"
            value={draft.sort}
            options={sortOptions(hasQuery)}
            onChange={(value) =>
              setDraft((current) => ({ ...current, sort: value }))
            }
          />
        </div>

        {/*
          Apply is a plain button rather than a `SheetClose`, because that would
          discard the draft along with the panel. It navigates, and the navigation
          is what closes the sheet. Cancel is the real `SheetClose`.
        */}
        <SheetFooter className="flex-row gap-2">
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
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button onClick={apply}>Show results</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
