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
  className,
  children,
}: {
  tag: TagLike;
  active?: boolean;
  href?: string;
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
      {/* `#` is legal in a slug and starts a fragment, hence the encoding. Built
          here so no call site can forget it. */}
      <Link href={href ?? `/?tag=${encodeURIComponent(tag.slug)}`}>
        {tag.name}
      </Link>
    </Badge>
  );
}
