import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

/**
 * Crawl rules, and the sitemap declaration.
 *
 * ## What this is for, and what it is not for
 *
 * **This file saves crawl budget; it does not decide what is indexed.** A URL
 * disallowed here is still reachable and still indexable by anything that
 * ignores the standard, and the authenticated routes are gated by
 * `auth.protect()` rather than by this file. Indexability is decided by the
 * `robots` metadata in `layout.tsx` and the per-route overrides, because
 * `noindex` is honoured by search engines in a way `robots.txt` is not — a
 * disallowed-but-linked URL gets indexed without a snippet.
 *
 * The two overlap deliberately: `Disallow` keeps a crawler from spending
 * requests on pages it should not index, and `noindex` makes sure that if one is
 * indexed anyway it carries no snippet.
 *
 * ## The authenticated routes are listed
 *
 * They are already unreachable without a session, so this is not what protects
 * them. It is here so a crawler does not spend a request discovering that for
 * every `/settings` URL it happens to try.
 */
export default function robots(): MetadataRoute.Robots {
  const sitemap = absoluteUrl("/sitemap.xml");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Authenticated or account-scoped. Each is behind `auth.protect()`,
          // and several redirect a signed-out visitor to sign-in — so a crawler
          // following one spends a request to be redirected and gets nothing.
          "/settings",
          "/saved",
          "/share",
          "/moderation",
          "/collections/new",
          // `new` is listed on its own because it is not under `/collections`
          // in a way this pattern would otherwise cover.
          "/collections",
          // Edit routes. The detail pages are public, so `edit` is matched
          // specifically rather than disallowing the whole segment.
          "/edit",

          /*
           * Search results on `/browse`.
           *
           * `q` is free text up to 100 characters, freely combinable with
           * `tag`, `type`, `accessType` and `sort` — so the space of query
           * URLs on this site is effectively unbounded, and every one of them
           * returns 200 with the same list. Left open, a crawler can walk that
           * space indefinitely.
           *
           * This is the one `Disallow` doing real work. The matching routes
           * also carry `noindex`, so nothing here is indexed even if a crawler
           * ignores this line.
           */
          "/browse?",

          /*
           * The old tag-in-query URLs.
           *
           * `next.config.ts` 308-redirects `/?tag=<slug>` to `/tags/<slug>`
           * before a render happens, so these are already gone by the time a
           * request reaches a page. Listed so the intent is recorded in both
           * places the redirect and the crawl rules are expressed.
           */
          "/?tag=",
        ],
      },
    ],
    ...(sitemap ? { sitemap } : {}),
  };
}
