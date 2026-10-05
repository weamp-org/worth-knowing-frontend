import Link from "next/link";

import { TagBadge } from "@/components/tag-badge";
import { Badge } from "@/components/ui/badge";
import { ContributorByline } from "@/lib/contributor";
import { formatDate, getHostname } from "@/lib/format";
import {
  ACCESS_TYPE_LABELS,
  RESOURCE_TYPE_LABELS,
  type Resource,
} from "@/lib/resource-types";

/**
 * One resource in the feed.
 *
 * Renders on the server and in the browser, so every value it shows has to be
 * deterministic — which is why the date goes through `formatDate`.
 *
 * `dense` is the rail variant, used by the home page's most-saved section: the
 * same content in a narrower column, with the `why` given two lines instead of
 * three. Three lines is right for a full-width feed row and wrong for a two-up
 * grid, where it turns every card into a truncated block of equal height.
 */
export function ResourceCard({
  resource,
  dense = false,
}: {
  resource: Resource;
  /** Renders the narrower rail variant. */
  dense?: boolean;
}) {
  return (
    <article
      className={
        dense
          ? "flex h-full flex-col gap-2 rounded-lg border border-border p-4"
          : "flex flex-col gap-3 border-b border-border py-6 last:border-b-0"
      }
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <Badge variant="secondary">{RESOURCE_TYPE_LABELS[resource.type]}</Badge>
        {/* The access badge is dropped in the rail rather than reordered: a
            two-up grid has room for one badge, and `Free` is the one that changes
            whether somebody can act on the recommendation. `Paid` is visible on
            the resource page and from the URL. */}
        {!dense && resource.accessType !== "UNKNOWN" ? (
          <Badge variant="outline">
            {ACCESS_TYPE_LABELS[resource.accessType]}
          </Badge>
        ) : null}
        {dense && resource.accessType === "FREE" ? (
          <Badge variant="outline">{ACCESS_TYPE_LABELS.FREE}</Badge>
        ) : null}
        <time dateTime={resource.createdAt}>
          {formatDate(resource.createdAt)}
        </time>
      </div>

      <h2
        className={
          dense
            ? "font-heading text-base font-semibold tracking-wide"
            : "font-heading text-xl font-semibold tracking-wide"
        }
      >
        <Link href={`/resources/${resource.id}`} className="hover:underline">
          {resource.title}
        </Link>
      </h2>

      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-fit text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {getHostname(resource.url)}
      </a>

      {/* `mt-auto` pins the byline to the bottom so the cards in a grid align
          with each other regardless of how long each `why` runs. */}
      <p
        className={
          dense
            ? "line-clamp-2 text-sm leading-relaxed"
            : "line-clamp-3 text-sm leading-relaxed"
        }
      >
        {resource.why}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
        <ContributorByline resource={resource} />
        {resource.tags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} />
        ))}
      </div>
    </article>
  );
}
