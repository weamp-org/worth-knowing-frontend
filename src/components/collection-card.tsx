import { LockIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { Collection } from "@/lib/collection-types";
import { formatDate } from "@/lib/format";

/**
 * One collection in a list.
 *
 * Renders on the server and in the browser, so every value it shows has to be
 * deterministic — which is why the date goes through `formatDate`. Same
 * constraint as `ResourceCard`, and for the same reason.
 */
export function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <article className="flex flex-col gap-2 border-b border-border py-6 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <Badge variant="secondary">
          {collection.resourceCount}{" "}
          {collection.resourceCount === 1 ? "resource" : "resources"}
        </Badge>
        {collection.isPrivate ? (
          // An icon with the word beside it, rather than an icon alone: "private"
          // here means "not published", and a padlock on its own reads as
          // "protected", which is a different promise.
          <span className="inline-flex items-center gap-1">
            <LockIcon aria-hidden="true" className="size-3" />
            Private
          </span>
        ) : null}
        <time dateTime={collection.createdAt}>
          Created {formatDate(collection.createdAt)}
        </time>
      </div>

      <h2 className="font-heading text-xl font-semibold tracking-wide">
        <Link
          href={`/collections/${collection.id}`}
          className="hover:underline"
        >
          {collection.title}
        </Link>
      </h2>

      {collection.description ? (
        <p className="line-clamp-3 text-sm leading-relaxed whitespace-pre-wrap">
          {collection.description}
        </p>
      ) : null}
    </article>
  );
}
