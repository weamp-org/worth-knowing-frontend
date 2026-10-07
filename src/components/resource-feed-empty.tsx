import { LibraryIcon, TagIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { ListResourcesParams } from "@/lib/resources-api";

/**
 * The three dead ends a resource listing can arrive at.
 *
 * Extracted from `ResourceFeed` so the home page's bounded recent section can
 * render the same states. That section is a server component with no client feed
 * to hang them off, and the alternative — a second copy of three wordings — is
 * how "Nothing here yet" quietly becomes "Nothing matched" on a page that never
 * searched for anything.
 *
 * Three distinct states, worded differently on purpose. A search that matched
 * nothing is the one a person is most likely to reach by accident — a typo, a tag
 * that does not exist — so it names the query and says where it looked, rather
 * than suggesting they share something.
 */
export function ResourceFeedEmpty({
  filters,
  canShare,
}: {
  /** Whatever narrowed the listing, so the wording can match the reason it is empty. */
  filters?: ListResourcesParams;
  /** Whether to offer the share call to action in the unfiltered case. */
  canShare: boolean;
}) {
  const { q, tag, contributor } = filters ?? {};
  const isFiltered = Boolean(q) || Boolean(tag) || Boolean(contributor);

  const title = q
    ? "Nothing matched"
    : tag
      ? "Nothing tagged with this yet"
      : "Nothing shared yet";

  const description = q
    ? `No resource matched “${q}”. Search looks at titles, tags, and the reason somebody gave for sharing something.`
    : tag
      ? "No resource carries this tag so far."
      : contributor
        ? "This profile has no contributions that show a name. Anything shared anonymously is not listed, including for the person it belongs to."
        : "Be the first to share something you found worth knowing.";

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isFiltered ? <TagIcon /> : <LibraryIcon />}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {isFiltered ? (
          <Button asChild variant="outline">
            <Link href="/browse">Browse everything</Link>
          </Button>
        ) : canShare ? (
          <Button asChild>
            <Link href="/share">Share something</Link>
          </Button>
        ) : null}
      </EmptyContent>
    </Empty>
  );
}
