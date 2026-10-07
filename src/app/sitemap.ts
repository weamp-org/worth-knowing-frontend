import type { MetadataRoute } from "next";

import { listPublicCollections } from "@/lib/collections-api";
import { listAllTags, listResources } from "@/lib/resources-api";
import { siteUrl } from "@/lib/site";

/**
 * The sitemap: every legitimate public page, and nothing else.
 *
 * ## Why this file is load-bearing rather than housekeeping
 *
 * The resource corpus is otherwise **unreachable to anything that does not
 * execute JavaScript**, and that is not a hypothetical gap:
 *
 * - There is no `/resources` index route. Only `/resources/[id]` exists.
 * - `GET /resources` is keyset-paginated with an opaque `base64` cursor, and a
 *   `?cursor=` value is never an `<a href>` anywhere — the only thing that advances
 *   it is the client `ResourceFeed`'s "Load more" button.
 * - The homepage bounds itself to six recent resources and links to `/browse`,
 *   whose page two requires JavaScript.
 *
 * So a crawler following links sees roughly six recent, six most-saved and one
 * random, and then the site ends. On a product whose entire asset is the corpus,
 * this file is the difference between "13 pages are findable" and "every
 * contribution is findable".
 *
 * ## Uses existing public endpoints
 *
 * `GET /resources` and `GET /collections` are `@Public()` and already keyset
 * paginated with a 100-row ceiling, so enumerating a few thousand rows is tens of
 * requests against endpoints that already exist. **No sitemap-specific backend
 * API was added.** Profiles are the one gap: there is no public user listing, and
 * adding one purely to feed a sitemap would be a new public enumeration surface
 * with no product reason. Profiles are still discovered — every named resource
 * links its contributor's profile, and every resource is listed here — so the hop
 * is one click rather than none.
 *
 * ## What is deliberately absent
 *
 * Authenticated routes; private collections and private profiles; `/browse`
 * search, filter and sort states; `/?tag=…` (redirected to `/tags/…`); and
 * `/contributors`, which is `noindex`. Listing a `noindex` URL in a sitemap is a
 * contradiction, and a private URL listed at all is a leak — this file is
 * generated without a session, so "private" here means the backend's own filter,
 * which is what makes the omission structural rather than a matter of care.
 *
 * ## Tags with nothing attached are skipped
 *
 * A tag is created implicitly on resource write and nothing sweeps it, so deleting
 * a resource can leave an orphan that no route can render. Listing one would
 * advertise a 404, so the `resourceCount > 0` check here is the difference
 * between a sitemap that is accurate and one that needs pruning by hand.
 */

/**
 * **Request-time, like every other route in this app.**
 *
 * A metadata route with no request-time API is prerendered at build time, and this
 * one reads live data — so without this line `pnpm build` fails, because the build
 * runs without the backend up. That is the same constraint every page here already
 * documents with `export const dynamic = "force-dynamic"`, and the same reason:
 * nothing in this app can be built without a reachable API.
 *
 * The cost is that a full enumeration runs per request rather than once per build.
 * That is a fair trade: a sitemap is fetched by crawlers on the order of daily, and
 * each fetch is tens of requests of at most 100 rows. An hourly `revalidate` would
 * be cheaper but would reintroduce build-time generation, which is the thing that
 * does not work here.
 */
export const dynamic = "force-dynamic";

/**
 * Smallest sensible page size for enumeration.
 *
 * The backend caps `limit` at 100 and defaults to 20. Asking for 100 is "as much
 * as you will give me in one round trip" — the same intent as the tag limit, and
 * the reason a sitemap over a few thousand rows is tens of requests rather than
 * hundreds.
 */
const PAGE_SIZE = 100;

/**
 * A hard stop on enumeration.
 *
 * 50,000 is the protocol ceiling for one sitemap file, so this can never produce
 * an oversized document. A larger site would need `generateSitemaps` and a sitemap
 * index, which is a different piece of work and not a V1 concern.
 */
const MAX_URLS = 50_000;

/**
 * Every URL in the sitemap, as absolute strings.
 *
 * Returns `[]` when no canonical origin is configured. A sitemap of relative URLs
 * is not valid per the protocol, and emitting one would be worse than emitting
 * none — so this fails closed, and `siteUrl()` being unset is a deployment
 * mistake the layout's own `metadataBase` will also have complained about.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  if (!base) return [];

  /**
   * Absolute URL for an app path.
   *
   * Paths are expected to be pre-encoded by the caller. A tag slug can contain
   * `#` (`C#`), which would otherwise start a fragment and produce a `<loc>` that
   * points at the wrong resource.
   */
  const url = (path: string) => new URL(path, base).toString();

  const entries: MetadataRoute.Sitemap = [];

  /** Refuses to add once the document would exceed the protocol ceiling. */
  const add = (path: string, lastModified?: string) => {
    if (entries.length >= MAX_URLS) return;

    entries.push({
      url: url(path),
      // Omitted rather than defaulted to "now". `lastModified` means "this
      // changed", and a value that moves on every crawl tells a crawler the whole
      // site changes constantly — which is exactly the signal to crawl less.
      ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
    });
  };

  /**
   * Walks one cursor-paginated endpoint to the end.
   *
   * Cursor rather than page number because that is the primitive the backend
   * offers; a `?cursor=` is meaningless to anything but the query that produced
   * it, which is fine here since the filters are fixed per call.
   */
  const walk = async <T>(
    fetchPage: (
      cursor?: string,
    ) => Promise<{ items: T[]; nextCursor: string | null }>,
  ): Promise<T[]> => {
    const collected: T[] = [];
    let cursor: string | undefined;

    // Bounded by `MAX_URLS` and re-checked each pass, so a backend that kept
    // handing back the same cursor could not spin here forever.
    do {
      const page = await fetchPage(cursor);
      collected.push(...page.items);

      // A backend answering a cursor with itself would otherwise loop until the
      // cap; the guard makes that a short list rather than a hang.
      if (cursor !== undefined && page.nextCursor === cursor) break;

      cursor = page.nextCursor ?? undefined;
    } while (cursor && collected.length < MAX_URLS);

    return collected;
  };

  // The homepage and the unfiltered browse view, which is the site's second front
  // door and a true listing of everything shared.
  add("/");
  add("/browse");

  // Public resources. Every one of them is the product's asset: a specific
  // resource plus somebody's reason for it.
  //
  // Read with no session, which is also what makes the anonymity redaction apply —
  // an anonymously shared contribution arrives here without its contributor, which
  // is correct for a sitemap regardless of who is asking.
  try {
    const resources = await walk((cursor) =>
      listResources({ limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) }),
    );

    for (const resource of resources) {
      add(`/resources/${encodeURIComponent(resource.id)}`, resource.updatedAt);
    }
  } catch {
    // A sitemap that is missing its resources is worse than one that is not
    // generated at all — it asserts completeness it does not have. Throwing lets
    // the route fail loudly; a crawler will retry, and a real backend outage is
    // worth seeing.
    throw new Error("Could not enumerate resources for the sitemap");
  }

  // Public collections. The backend filters private ones out in the query, so a
  // private collection cannot reach this list at all.
  try {
    const collections = await walk((cursor) =>
      listPublicCollections({
        limit: PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
      }),
    );

    for (const collection of collections) {
      add(
        `/collections/${encodeURIComponent(collection.id)}`,
        collection.updatedAt,
      );
    }
  } catch {
    throw new Error("Could not enumerate collections for the sitemap");
  }

  // Every tag that still has something on it. `listAllTags` asks for the whole
  // vocabulary rather than the navigation's most-used twenty, which is the
  // difference between a tag page being discoverable and not.
  //
  // **No `lastModified` for tags**, unlike resources and collections. The tag read
  // returns no timestamp, so there is nothing honest to put here — and a
  // `lastModified` invented as "now" would make every tag look like it had just
  // changed, which is the one signal that makes a crawler ignore the field.
  // A tag's content changes when a resource is added to it, and that resource is
  // itself in the sitemap with its own timestamp.
  try {
    const tags = await listAllTags();

    for (const tag of tags) {
      // An orphaned tag can render no page, so it is not listed.
      if (tag.resourceCount < 1) continue;

      add(`/tags/${encodeURIComponent(tag.slug)}`);
    }
  } catch {
    throw new Error("Could not enumerate tags for the sitemap");
  }

  return entries;
}
