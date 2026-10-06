import {
  DiscoveryLink,
  OutboundResourceLink,
} from "@/components/discovery-link";
import { TagBadge } from "@/components/tag-badge";
import { Badge } from "@/components/ui/badge";
import type { DiscoverySource } from "@/lib/analytics";
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
  /**
   * Which surface this card is listed on. Recorded when the reader follows the
   * card to the resource, so views attribute to the listing they came from.
   */
  source = "direct",
}: {
  resource: Resource;
  /** Renders the narrower rail variant. */
  dense?: boolean;
  source?: DiscoverySource;
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
        <DiscoveryLink
          href={`/resources/${resource.id}`}
          source={source}
          className="hover:underline"
        >
          {resource.title}
        </DiscoveryLink>
      </h2>

      <OutboundResourceLink
        url={resource.url}
        resourceId={resource.id}
        location="card"
        source={source}
        className="w-fit text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {getHostname(resource.url)}
      </OutboundResourceLink>

      {/* `mt-auto` pins the footer to the bottom so the cards in a grid align with
          each other regardless of how long each `why` runs. */}
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
        <SavedCount resource={resource} />
      </div>
    </article>
  );
}

/**
 * How many people saved this, as a plain statement of fact.
 *
 * **Saved count only, and `commentCount` is deliberately absent** — see
 * `worth-knowing-backend/docs/comments.md`. A comment is somebody's *reaction* to
 * a `why`, so its count is evidence about the conversation around a resource
 * rather than about the resource. That is fine attached to the thread it belongs
 * to, which is where the resource page puts it, and wrong on a card: in the feed
 * people scan rather than read, and a bare number next to a speech glyph reads as
 * a quality score. Which is the "count of remarks, not a quality rating" line
 * lost in translation — and worse than a most-commented rail ever would have
 * been, because that confined the signal to one labelled section and this puts it
 * on every card on the most-read surface on the site.
 *
 * **The noun is spelled out on purpose.** `5` next to a bookmark glyph is a score;
 * `5 saved` is a sentence. The glyph-plus-number shorthand is exactly how a count
 * acquires an implied claim to quality, and the whole point of showing it is to
 * report interest rather than to rank.
 *
 * **Hidden below 1.** A lone `1 saved` is noise on a card, and `0 saved` is a
 * discouraging thing to print under somebody's first contribution — the count is
 * there to say "people came back for this", which is not a thing it can say about
 * a resource nobody has saved.
 *
 * Non-interactive by design. The card is a server component and the count arrives
 * free with the payload; making it a `SaveButton` would put 20 client components
 * and 20 per-card `GET /saved/:resourceId` calls on the feed, and the optimistic
 * count would go stale invisibly — saving in the feed would update that one card
 * while every other copy of the same resource elsewhere on the page kept the old
 * number. The feed reports the count; the resource page is where you save.
 */
function SavedCount({ resource }: { resource: Resource }) {
  if (resource.savedCount < 1) return null;

  return (
    <span className="tabular-nums">
      {resource.savedCount} {resource.savedCount === 1 ? "save" : "saves"}
    </span>
  );
}
