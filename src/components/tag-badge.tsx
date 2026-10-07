import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The two fields a tag needs to render. Both `TagSummary` and `TagSearchResult`
 * satisfy it, so a call site does not have to care which it holds.
 */
interface TagLike {
  name: string;
  slug: string;
}

/**
 * Geometry the vendored badge base does not provide.
 *
 * `Badge` in `ui/badge.tsx` is a *label* style — `rounded-none`, `px-0 py-0`,
 * `bg-transparent` — so a tag rendered with it alone read as 10px grey text
 * rather than as a tag at all. These turn it into a chip: small enough to stay
 * under the resource title, round enough to read as a discrete thing.
 *
 * Also drops `uppercase` and `tracking-widest`, which the base sets. A tag name
 * is user vocabulary — `machine learning` rendered as `MACHINE LEARNING`
 * misrepresents what the contributor typed. The uppercase labels elsewhere in
 * the app are system vocabulary (resource types, access types), where it costs
 * nothing.
 */
const CHIP_CLASS =
  "rounded-full border border-border px-2 py-0.5 text-xs font-normal normal-case tracking-normal";

/**
 * A tag, rendered the same way everywhere it appears.
 *
 * Four call sites — the feed's filter nav, a card in the feed, the footer of a
 * resource, and the removable chips in the share form — had each grown their own
 * padding and variant choices and drifted apart. This is the single place that
 * decides what a tag looks like, so the next one cannot start over.
 *
 * Two states, because the filter nav has to show which filter is active and
 * `Badge`'s own `secondary` and `ghost` variants cannot express that: rendered
 * `asChild` both resolve to `text-muted-foreground` with
 * `hover:text-foreground` on the same element, so the selected tag was
 * indistinguishable from the rest.
 *
 * `children` replaces the usual name-plus-link with arbitrary content, for the
 * share form's removable chips. That keeps this a server component — a
 * component taking an `onClick` callback could not be imported by a server
 * parent at all, and three of the four call sites are server-rendered.
 */
export function TagBadge({
  tag,
  active = false,
  /** Overrides the filter URL, for the nav's "Everything" reset link. */
  href,
  count,
  className,
  children,
}: {
  tag: TagLike;
  active?: boolean;
  href?: string;
  /**
   * How many resources carry this tag, shown only where a count explains
   * something.
   *
   * **Optional, and only the feed's tag nav passes it.** `GET /tags` has always
   * returned `resourceCount` and the nav has always fetched all twenty rows
   * without reading it, so this renders data that was already in the browser —
   * no request, no schema change.
   *
   * It is on the nav and not on a card because of the type, before it is a
   * matter of taste: `TagSummary` — the shape tags arrive in on a resource —
   * carries no count at all. Putting one on a card would mean a lookup per tag
   * per card, or widening the include on the most-read query on the site. That
   * is also the better outcome: a number beside a chip in a feed people scan
   * reads as a rating on the tag, which is what {@link SavedCount} exists to
   * avoid.
   *
   * On the nav it earns its place for the opposite reason — the list is already
   * sorted by usage, so the count is what explains the order. Without it, "why
   * is `databases` above `writing`?" has no answer on the page.
   */
  count?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const state = active
    ? "border-transparent bg-secondary text-secondary-foreground"
    : "text-muted-foreground hover:text-foreground";

  if (children) {
    return (
      <Badge variant="secondary" className={cn(CHIP_CLASS, className)}>
        {tag.name}
        {children}
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      asChild
      className={cn(CHIP_CLASS, state, className)}
    >
      {/*
        `/tags/[slug]`, not `/?tag=`.

        A tag is a place, and this is its address. The `/?tag=` form rendered the
        homepage with six cards swapped, shared the homepage's title and
        description, and had nowhere a crawler could treat as a topic — while the
        slug was already documented as permanent, linkable identity. `#` is legal
        in a slug (`C#`) and starts a fragment, hence the encoding; built here so
        no call site can forget it.

        An explicit `href` still wins, which is what `/browse`'s nav passes: there
        the tag is a filter *within a search view*, not a destination.
      */}
      <Link href={href ?? `/tags/${encodeURIComponent(tag.slug)}`}>
        {tag.name}
        {typeof count === "number" ? <TagCount count={count} /> : null}
      </Link>
    </Badge>
  );
}

/**
 * The usage count inside a nav chip.
 *
 * **A bare numeral, not `3 resources`,** which is the opposite of what
 * {@link SavedCount} argues for and is deliberate. A chip is a fixed small box —
 * spelling out the noun would triple its width and wrap a twenty-chip nav onto
 * three lines — and a bare number on a *tag* is not the hazard a bare number on
 * a *resource* is. Nobody reads `databases 14` as a claim about how good
 * databases are; the tag is a label the reader already understands, so the digit
 * is read as metadata about the list they are scanning. On a card the same digit
 * would sit beside a contribution and start implying a score.
 *
 * `tabular-nums` so a two-digit count does not shift the chips beside it, and
 * `font-normal` so the count does not out-weigh the tag name it belongs to.
 * The muted foreground is inherited, which keeps it in the chip's own state —
 * selected chips grey their count along with their name.
 *
 * `aria-hidden` on the numeral with a spelled-out `sr-only` after it: a screen
 * reader announcing "databases fourteen" gives a number with no noun, and this
 * is decorative information beside a link whose destination already says how
 * many there are. The `sr-only` span carries its own leading space so the two
 * do not run together when read aloud.
 */
function TagCount({ count }: { count: number }) {
  return (
    <>
      {/* The separating space is inside the numeral's own hidden span, so it is
          hidden along with the number rather than being announced as a pause
          between the tag name and the count. `&nbsp;` rather than a normal space
          because the chip is `whitespace-nowrap` — a plain space here would be
          the one thing allowed to wrap, putting the count on its own line. */}
      <span aria-hidden="true" className="tabular-nums font-normal">
        &nbsp;
        {count}
      </span>
      <span className="sr-only">
        {` ${count} ${count === 1 ? "resource" : "resources"}`}
      </span>
    </>
  );
}
