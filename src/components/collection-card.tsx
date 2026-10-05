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
 *
 * **The owner is shown, and that is what makes the home section honest.** Without
 * a byline, four collections by one prolific curator look like four collections by
 * four people, so the section being monopolised is invisible — which is worse than
 * the concentration itself, because nobody can tell it is happening.
 *
 * Same reasoning as a resource byline: a collection is a statement by somebody
 * about what they think is worth knowing, and there is no anonymous mode for it.
 * Mirrors `ContributorByline`'s rule exactly — link when `profilePath` is a string,
 * plain text when it is `null` — because a private profile or an unclaimed handle
 * means there is somewhere to go *from the name* and not from here, which is a
 * different thing from the name being hidden.
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

      {/*
        Byline last, after the description.

        The description is the reason to open the collection and it is the curator
        speaking, so the attribution reads as belonging to the sentence above it
        rather than as metadata trailing a title. On a resource card the byline is
        also last, and for the same reason.

        `owner` is null only when the account has been deleted — a collection
        outlives its curator in the schema, and there is no anonymous mode. Omit
        the line entirely in that case rather than substituting a placeholder,
        which is the rule `ContributorByline` follows for the same reason.
      */}
      {collection.owner ? (
        <p className="text-xs text-muted-foreground">
          Collected by{" "}
          {collection.owner.profilePath ? (
            <Link
              href={collection.owner.profilePath}
              className="hover:underline"
            >
              {collection.owner.name ?? "a Worth Knowing member"}
            </Link>
          ) : (
            (collection.owner.name ?? "a Worth Knowing member")
          )}
        </p>
      ) : null}
    </article>
  );
}
