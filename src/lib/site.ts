/**
 * The site's canonical origin, in one place.
 *
 * Everything absolute — `metadataBase`, the sitemap, canonical URLs, Open Graph
 * URLs, the `robots.txt` sitemap declaration — is built from this single value,
 * so there is exactly one place to change when the deployment host changes.
 *
 * **`NEXT_PUBLIC_SITE_URL` with no default on purpose.** A defaulted fallback
 * here would be a silent way to ship localhost canonicals: `metadataBase` would
 * resolve, the build would pass, and every canonical and OG URL would point at
 * `http://localhost:3001` in production — which is worse than a build error,
 * because it fails invisibly and only after deploy. Throwing instead means a
 * missing variable is caught at build time rather than by a search engine.
 *
 * `.env.local.example` carries the production value, so a fresh clone has a
 * working one and a deployment only has to override it if it differs.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

/**
 * The canonical origin as a `URL`, or `null` when the variable is unset.
 *
 * `null` rather than a placeholder, because every caller treats "no configured
 * origin" differently: the layout falls back to relative metadata (Next then
 * raises on any absolute URL-based field, which is the outcome we want), while
 * the sitemap and robots files have no metadata pipeline to fail in and are
 * simply omitted.
 */
export function siteUrl(): URL | null {
  if (!SITE_URL) return null;

  try {
    return new URL(SITE_URL);
  } catch {
    return null;
  }
}

/**
 * A canonical absolute URL for an app path, or `null` without a configured
 * origin.
 *
 * `path` is the route's own path — `/resources/abc` — and is expected to be
 * already encoded. Callers holding a raw slug must percent-encode it first,
 * because a slug can legitimately contain `#` (`C#`), which would otherwise
 * start a fragment and silently truncate the URL.
 */
export function absoluteUrl(path: string): string | null {
  const base = siteUrl();

  return base ? new URL(path, base).toString() : null;
}

/**
 * The site-wide default social card, as an absolute URL.
 *
 * ## Why any page setting its own `openGraph` must pass this
 *
 * **`openGraph` is replaced, not merged, when a page defines it.** The layout's
 * block is a default for routes that say nothing; a route that sets `og:title`,
 * `og:description` and `og:url` to its own values gets *only* those, and silently
 * loses the inherited `images`. That was a real bug here — `/browse`, `/tags/[slug]`
 * and `/u/[username]` all rendered `og:title` correctly and no card at all,
 * because each set its own `openGraph` without naming an image.
 *
 * So this is passed explicitly everywhere a page defines its own `openGraph`. It
 * cannot be fixed centrally, and the alternative — omitting `openGraph` from a page
 * and losing the per-page title — is worse.
 *
 * A route with its **own** `opengraph-image` file (resources do, at
 * `resources/[id]/`) does not need this: Next resolves the more specific file and
 * emits the URL itself.
 */
export function siteOgImage(): string | undefined {
  return absoluteUrl("/opengraph-image") ?? undefined;
}

/**
 * The wordmark, used where a title needs the product's name.
 *
 * A constant rather than a literal repeated in five title templates, because the
 * alternative is a rename that misses one.
 */
export const SITE_NAME = "Worth Knowing";

/**
 * The one sentence the product states its premise in.
 *
 * Used as the homepage description and as the `h1`. It is the only place the
 * premise exists in words, it is not repeated in the footer, and it is what a
 * search snippet has to work with on a page that is a feed rather than an
 * article.
 */
export const SITE_TAGLINE =
  "Discover things worth knowing, from people who found them worth knowing.";
