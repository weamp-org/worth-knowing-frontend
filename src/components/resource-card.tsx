import Link from "next/link";

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
 */
export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <article className="flex flex-col gap-3 border-b border-border py-6 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <Badge variant="secondary">{RESOURCE_TYPE_LABELS[resource.type]}</Badge>
        {resource.accessType !== "UNKNOWN" ? (
          <Badge variant="outline">
            {ACCESS_TYPE_LABELS[resource.accessType]}
          </Badge>
        ) : null}
        <time dateTime={resource.createdAt}>
          {formatDate(resource.createdAt)}
        </time>
      </div>

      <h2 className="font-heading text-xl font-semibold tracking-wide">
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

      <p className="line-clamp-3 text-sm leading-relaxed">{resource.why}</p>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <ContributorByline resource={resource} />
        {resource.tags.map((tag) => (
          // A `#` in a slug starts a fragment, so the slug has to be encoded
          // rather than dropped into the path as-is.
          <Badge key={tag.id} variant="ghost" asChild>
            <Link href={`/?tag=${encodeURIComponent(tag.slug)}`}>
              {tag.name}
            </Link>
          </Badge>
        ))}
      </div>
    </article>
  );
}
