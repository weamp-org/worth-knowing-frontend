import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";

import { CollectionCard } from "@/components/collection-card";
import { HomeSection } from "@/components/home-section";
import { ResourceCard } from "@/components/resource-card";
import { ResourceFeedEmpty } from "@/components/resource-feed-empty";
import { SearchBox } from "@/components/search-box";
import { SurpriseMe } from "@/components/surprise-me";
import { TagBadge } from "@/components/tag-badge";
import { browseHref } from "@/lib/browse";
import type { CollectionSummary } from "@/lib/collection-types";
import { listPublicCollections } from "@/lib/collections-api";
import { getRandomResourceOrNull } from "@/lib/resource-queries";
import type { TagSearchResult } from "@/lib/resource-types";
import {
  listMostSaved,
  listResources,
  listTags,
  TOP_SAVED_RAIL_SIZE,
} from "@/lib/resources-api";

/**
 * Every render reads live data from the backend, so this must not be
 * prerendered at build time — `pnpm build` runs without the backend up.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Worth Knowing",
  description:
    "Discover things worth knowing, from people who found them worth knowing.",
};

/**
 * How many rows the recent section shows before it hands over to `/browse`.
 *
 * Six, and the number is a layout decision rather than a page size. The sections
 * below only exist if this one ends: an unbounded "Load more" here pushes the
 * most-saved rail and the surprise card past an arbitrarily long scroll, which on
 * a busy site is the same as not shipping them.
 */
const RECENT_SECTION_SIZE = 6;

/**
 * How many collections the home page shows.
 *
 * Four rather than six. `CollectionCard` carries a `line-clamp-3` description —
 * a curator's reason for the grouping — so each one is taller than a resource
 * card, and this is a section to glance at rather than to read down.
 */
const COLLECTIONS_SECTION_SIZE = 4;

/**
 * How many collections to fetch for that section.
 *
 * Three times what it shows, because the section **dedupes by owner** — see
 * {@link spreadAcrossOwners}. Fetching exactly four would make the diversity rule
 * a no-op on any day when one curator published more than one, which is the exact
 * case it exists for.
 *
 * Three is enough headroom rather than an arbitrary multiplier: it tolerates one
 * curator taking a third of the recent slots, which on a young site is most of
 * what happens, and a larger multiple starts returning older collections purely to
 * find a fresh owner — trading a section about *recent* curation for one about
 * nobody in particular.
 */
const COLLECTIONS_FETCH_SIZE = COLLECTIONS_SECTION_SIZE * 3;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;

  /*
   * One `Promise.all` rather than five awaits.
   *
   * `mostSaved` does not depend on `tag` and is still sent: the rail is the same
   * six resources whether the feed is filtered or not, so folding it into
   * `listResources` would mean the rail silently changed meaning with the tag
   * filter above it — the kind of coupling nobody can see until a person notices
   * the rail is different on a filtered page and cannot work out why.
   *
   * `collections` is filtered by nothing at all, for the same reason — and
   * because the alternative would be worse: letting the tag filter narrow a list
   * of *curations* would quietly change what the section means, since a
   * collection is not a tagged resource and carries no tags of its own.
   *
   * `randomResource` rides along for the same reason, and for a second one: it is
   * `null`-able rather than throwing, so it cannot reject this `all` and take the
   * page down. An empty site has no resource to be surprised by, and a home page
   * that 500s because a section had nothing to show would be an absurd place to
   * draw the line.
   *
   * Parallel, so the home page waits on the slowest of the five rather than
   * their sum.
   */
  const [{ userId }, page, tags, mostSaved, randomResource, publicCollections] =
    await Promise.all([
      // Only used to decide whether the empty state offers a share button. The
      // feed itself is public either way.
      auth(),
      // `limit` is one over the section size, so `nextCursor` answers "is there
      // more?" without a `COUNT(*)` — the same trick the feed uses, and it is why
      // "See everything" only appears when there genuinely is more.
      listResources({ tag, limit: RECENT_SECTION_SIZE + 1 }),
      listTags(),
      listMostSaved(TOP_SAVED_RAIL_SIZE),
      getRandomResourceOrNull(),
      // Unfiltered, so this lists every public collection on the site. The backend
      // drops private ones in the query, so a private collection cannot reach this
      // list — asking for one would be asking for a list of 404s.
      //
      // `COLLECTIONS_FETCH_SIZE`, not the section size: over-fetching is what gives
      // `spreadAcrossOwners` something to spread.
      listPublicCollections({ limit: COLLECTIONS_FETCH_SIZE }),
    ]);

  const hasMoreRecent = page.nextCursor !== null;
  const recent = page.items.slice(0, RECENT_SECTION_SIZE);
  const collections = spreadAcrossOwners(
    publicCollections.items,
    COLLECTIONS_SECTION_SIZE,
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading text-4xl font-semibold tracking-wide">
        Worth Knowing
      </h1>
      <p className="mt-3 text-muted-foreground">
        Discover things worth knowing, from people who found them worth knowing.
      </p>

      {/*
        The search field sits here rather than in the header, and the page stays
        the feed's home rather than becoming a marketing page.

        Both are deliberate. `/browse` is where a search *lands*, with the filters
        and the ordering beside it, so this box is a way into that route rather
        than a filter over what is already below it.

        The page is now the one this comment used to say it was not: three
        sections instead of a single endless list, with the feed as the first of
        them. That was always the plan — see the note on the bounded recent
        section above — and it happened without moving a single link, because
        every `/?tag=` URL still resolves to the same page.
      */}
      <div className="mt-8">
        <SearchBox id="home-search" />

        {/*
          The way into `/browse` without a query. Submitting an empty box already
          lands there, so this is a discoverability fix rather than a new route —
          but a whole page that only exists if you guess the URL, or happen to
          clear a search box and press enter, is a page most people will never
          find. Deliberately quiet: this is the fallback for someone who did not
          know what to search for, not a second thing to do.
        */}
        <p className="mt-3 text-sm text-muted-foreground">
          Not sure what to look for?{" "}
          <Link
            href="/browse"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Browse everything
          </Link>
          .
        </p>
      </div>

      <TagFilter tags={tags} activeTag={tag} />

      {/*
        Recent, bounded to six.

        Server-rendered and static, where it used to be a client `ResourceFeed`
        that accumulated pages. There is no "Load more" here any more: the link
        below is the way onward, and it lands on `/browse` with the tag already
        applied, so nothing about the view is lost by leaving.

        The filter is passed to the empty state rather than re-derived from the
        chips, so a filtered feed that matched nothing says so instead of
        offering to share something into a tag it is not.
      */}
      <HomeSection
        id="recent"
        title={tag ? `Recently tagged ${tag}` : "Recently shared"}
        description="The newest contributions from people here."
      >
        {recent.length === 0 ? (
          <ResourceFeedEmpty filters={{ tag }} canShare={userId !== null} />
        ) : (
          <>
            <div>
              {recent.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>

            {/*
              Only when there is more. `nextCursor` is non-null precisely because
              row seven exists, so this is a true statement rather than a
              round-trip to find out — and on a site with six resources in total
              it does not offer a link to an empty page.
            */}
            {hasMoreRecent ? (
              <p className="mt-8 text-sm">
                <Link
                  href={browseHref({ tag })}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  See everything
                </Link>
              </p>
            ) : null}
          </>
        )}
      </HomeSection>

      {/*
        Most saved.

        `mostSaved.length === 0` renders nothing at all — no heading, no band.
        The backend deliberately excludes resources nobody has saved, so an empty
        array is a real answer ("nobody has saved anything yet"), and the two
        lazier alternatives are both bad: padding it with unsaved resources puts
        a "Most saved" heading above a row of zeros, and a placeholder band
        advertises an emptiness the rest of the page does not need to.

        The heading is **"Most saved" and not "Best"**, which is the load-bearing
        word. The count says people came back for something; it does not say that
        thing is the strongest one here, and a rail making that claim on the most
        read surface on the site would be the API's own distinction between
        interest and quality quietly thrown away.
      */}
      <HomeSection
        id="most-saved"
        title="Most saved"
        description="What people have come back for. Popular, not endorsed."
      >
        {mostSaved.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {mostSaved.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} dense />
            ))}
          </div>
        ) : null}
      </HomeSection>

      {/*
        Surprise me, with the resource already drawn.

        `randomResource` is null only on a site with no resources at all, and then
        the section renders nothing — the same rule as the rail above, and for the
        same reason. The alternative, an error or a disabled button, would put a
        visible scar on a front page that is merely new.

        Pre-drawn rather than behind a click, which also means this section is the
        only part of the home page that renders without JavaScript. The button is a
        client affordance for asking for another, not the thing that makes the
        section exist.
      */}
      {randomResource ? (
        <HomeSection
          id="surprise"
          title="Surprise me"
          description="One thing somebody here thought was worth knowing. Read the reason, or skip it."
        >
          <SurpriseMe initialResource={randomResource} />
        </HomeSection>
      ) : null}

      {/*
        Recently collected.

        **Chronological, and deliberately not a ranked index.** The backend
        declined a global collections browse on the grounds that a collection is
        "a statement by somebody about their taste, which belongs beside the
        contributions that express the same taste, not in a ranked index of its own"
        — and that objection is to *ranking*, not to being listed. This is
        newest-first, sits beside the feed rather than on a route of its own, and
        the card leads with the curator's own `description`.

        It is also why there is no `/collections/browse`. There is nothing on a
        collection to rank by — no save count, no followers, no views — so a
        "top collections" page could only be ordered by recency, which is exactly
        what this section is. A second URL doing strictly less, and an invitation
        to attach a count later and build the ranked index that was declined.

        **The firehose, and how it is handled.** Newest-first with nothing else
        means one prolific curator takes every slot and keeps taking them, since
        recency is the only ordering there is. `spreadAcrossOwners` caps that at one
        collection per person, and the card now carries a byline so the
        concentration would be *visible* even where the cap cannot help.

        Both, because the cap alone is invisible: it just yields fewer cards with
        no explanation, and a reader cannot tell whether the site has three curators
        or one.

        Collapses when empty like every other section here — which is most sites
        at first, since a collection has to be made public before it can appear
        here and a private one never does.
      */}
      <HomeSection
        id="collections"
        title="Recently collected"
        description="Groups of resources somebody kept together, and why."
      >
        {collections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </HomeSection>
    </div>
  );
}

/**
 * At most one collection per owner, newest first, up to `limit`.
 *
 * **The firehose fix.** `GET /collections` orders by `(createdAt DESC, id DESC)`
 * and nothing else, so a curator who publishes several collections takes every
 * slot in a bounded section and keeps taking them — nothing self-corrects, because
 * recency is the only ordering there is. Four cards by one person is not a
 * discovery surface.
 *
 * Implemented here rather than as `DISTINCT ON (owner_id)` in the backend query,
 * and that placement is the point:
 *
 * - **The section is unpaginated by construction**, so the diversity rule needs no
 *   cursor and does not have to change what one means. Putting it in the query
 *   would change the *paginated* endpoint's cursor semantics to serve a section
 *   that has no pages — the same trap `savedCount` is kept out of
 *   `ResourceSort` to avoid.
 * - No new raw SQL, and no new index to reason about, for a rule that exists
 *   because of how this page composes a section.
 *
 * **It may return fewer than `limit`,** and that is the correct answer rather than
 * a shortfall to pad: three curators with public collections is three cards. Four
 * cards where one person wrote all four is worse than three.
 *
 * A collection whose owner has been deleted is kept, and never treated as a
 * duplicate. `owner` is `null` for those, and a collection outlives its curator in
 * the schema, so those rows are real and listable. They are rare — deleting an
 * account cascades the collections away — and the rule that matters is *no person
 * twice*, which has no meaning for an owner that is not there.
 */
function spreadAcrossOwners(
  collections: CollectionSummary[],
  limit: number,
): CollectionSummary[] {
  const seen = new Set<string>();
  const spread: CollectionSummary[] = [];

  for (const collection of collections) {
    if (spread.length === limit) break;

    /*
     * Keyed on the display name, because that is the only stable handle the owner
     * summary carries. `CollectionOwner` has no `id`, and that is deliberate — a
     * collection is never anonymous, so there is no case where the owner is being
     * withheld and a raw id would be the only handle left on them
     * (`collections.service.ts`). It is not worth adding one to serve a
     * de-duplication rule.
     *
     * `profilePath` would be the better key and is *not* used, because it is null
     * for a private profile and an unclaimed handle — so every collection by a
     * curator who keeps their profile private would pass as distinct, which is
     * exactly the firehose this is fixing. Private curators are also the ones most
     * likely to publish several collections.
     *
     * Two accounts sharing a display name are therefore treated as one person, so
     * the section may show fewer cards than it has room for. That is the same
     * failure mode as the short section and the same accepted trade: under-filling
     * a four-card rail beats filling it with one voice.
     *
     * A collection whose owner was deleted has no name at all, so it is never
     * treated as a duplicate. Those rows are rare — deleting an account cascades
     * its collections away — and the rule that matters is *no person twice*, which
     * has no meaning for an owner that is not there.
     */
    const ownerName = collection.owner?.name;

    if (ownerName) {
      if (seen.has(ownerName)) continue;
      seen.add(ownerName);
    }

    spread.push(collection);
  }

  return spread;
}

/**
 * The vocabulary, most-used first — `GET /tags` already sorts by usage, so
 * there is nothing to rank here.
 */
function TagFilter({
  tags,
  activeTag,
}: {
  tags: TagSearchResult[];
  activeTag?: string;
}) {
  if (tags.length === 0) return null;

  return (
    <nav aria-label="Filter by tag" className="mt-8 flex flex-wrap gap-2">
      {/* The reset link shares the tag chip's shape. `activeTag` being undefined
          is the unfiltered state, so that is when "Everything" is selected —
          including on a slug that matches no tag, where the empty state says so. */}
      <TagBadge
        tag={{ name: "Everything", slug: "" }}
        active={!activeTag}
        href="/"
      />
      {tags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} active={activeTag === tag.slug} />
      ))}
    </nav>
  );
}
