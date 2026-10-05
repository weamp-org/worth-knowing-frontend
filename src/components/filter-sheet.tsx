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

      {/*
        `max-h-[85dvh]` because `SheetContent` is `side="bottom"`, and that side is
        `h-auto` — the sheet is exactly as tall as its contents, with no ceiling of
        its own. Three selects, a title and a description do not fit a short phone,
        so an uncapped sheet grew upwards off the top of the screen and took the
        header with it. `dvh` rather than `vh` because mobile browser chrome makes
        `vh` larger than the space actually on show, which is exactly the wrong
        number to cap against; the rest of the screen stays visible underneath, so
        it still reads as a sheet.
      */}
      <SheetContent side="bottom" className="max-h-[85dvh]">
        {/*
          `p-6` over the vendored `p-8`. Header, body and footer each carried 32px,
          which stacked into 64px of nothing between the description and the first
          control — for three dropdowns that is most of the panel.
        */}
        <SheetHeader className="p-6">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            {hasQuery
              ? "Narrowing what the search matched."
              : "Narrowing everything shared here."}
          </SheetDescription>
        </SheetHeader>

        {/*
          `flex-1 overflow-y-auto` is what the cap above makes possible: a flex item's
          automatic minimum size is its content size *unless* its overflow is not
          `visible`, which this sets — so once the panel is capped, this region
          absorbs the shortfall and scrolls while the header and footer stay put.

          No top padding — `p-0` for the vendored `p-8` — because the header's own
          bottom padding already spaces these controls off the description, and the
          two were adding up.

          `overscroll-contain` because a scroll region inside a fixed overlay will
          otherwise chain its gesture to the page behind it, which is jarring on a
          touch device.
        */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-0 px-6 pb-6">
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

          **Two rows, not one.** These labels are styled small and wide-tracked, and
          every `Button` is `shrink-0`, so `Reset`, `Cancel` and `Show results` in a
          single row needed more width than a 375px phone has left after padding —
          they simply ran off the right edge of the sheet. The two secondary actions
          pair above, and the one that commits the draft gets the full width and the
          only filled button, which is where the emphasis belongs anyway.
        */}
        <SheetFooter className="gap-2 border-t border-border p-4 px-6 pb-6">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
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
          </div>
          <Button className="w-full" onClick={apply}>
            Show results
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
