import type { NextConfig } from "next";

/**
 * Next.js's own HTML-limited-bot pattern, copied verbatim from
 * `next/dist/shared/lib/router/utils/html-bots.js` in the installed 16.3.6.
 *
 * **This list must stay complete, and the reason is a trap rather than a
 * formality.** `htmlLimitedBots` *replaces* the default — it does not extend it
 * (`streaming-metadata.js` resolves `htmlLimitedBots || HTML_LIMITED_BOT_UA_RE`).
 * So setting `htmlLimitedBots: /Googlebot/` alone would silently regress every bot
 * currently on that list: Twitterbot, `facebookexternalhit`, Slackbot, LinkedInBot,
 * Discordbot, `applebot`, Bingbot, DuckDuckBot, Yandex, and the `-Google` and
 * `Google-` variants. That is the difference between a social preview working and
 * every one of them breaking, in exchange for one addition.
 *
 * Kept as a string rather than a `RegExp` literal so it is greppable against the
 * installed file: if a future Next upgrade changes the default, this line is
 * findable by the search that would catch it. `config.js` converts a `RegExp` to
 * its `.source` anyway, so the two are equivalent at runtime.
 */
const NEXT_DEFAULT_HTML_LIMITED_BOTS =
  "([\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight)";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  /**
   * Blocking metadata for Googlebot as well.
   *
   * Every public page here is `force-dynamic`, so Next streams
   * `generateMetadata` into the body rather than blocking the render on it — and
   * it decides which bots get blocking metadata by matching their user agent
   * against the pattern above. Both Google alternatives in that pattern require a
   * **hyphen** (`Mediapartners-Google`, `Google-InspectionTool`), so bare
   * `Googlebot/2.1` matches neither and takes the streaming path.
   *
   * Next's own position is that this is fine: metadata is "appended to the
   * `<body>` tag" and it has "verified that metadata is interpreted correctly by
   * bots that execute JavaScript and inspect the full DOM (e.g. `Googlebot`)"
   * (`generate-metadata.md`). So this is **hardening for clarity, not a
   * correctness fix** — the two readings of a JS-injected `<title>` differ between
   * Next and Google's own guidance on rendering, and this removes the question.
   *
   * It is cheap here for a specific reason: `getCachedResource` is already
   * `cache()`d, so metadata and the page body share one fetch. Blocking the
   * metadata changes when the `<head>` flushes, not how many requests are made.
   *
   * The cost is real and stated: blocking metadata waits on `generateMetadata`
   * before streaming, so TTFB and LCP get slightly worse. On a page that makes one
   * cached backend call in metadata and one in the body, that is one extra round
   * trip's worth of latency for the bots on this list and for nobody else —
   * human browsers keep streaming metadata, because they are not on it.
   *
   * **Verified, not assumed.** The behaviour above was confirmed by running the
   * installed package's compiled regex against real user-agent strings, and by
   * reproducing the override semantics in `streaming-metadata.js`. See
   * `docs/seo.md`.
   *
   * **What is deliberately *not* here: a redirect.** `/?tag=<slug>` →
   * `/tags/<slug>` was originally written as a config redirect with a `has` capture
   * group, and **it silently truncated any slug containing `#`** — the captured
   * value is decoded when read out of the query string but is not re-encoded when
   * substituted into the destination, so `C#` became `/tags/c`. That slug is real
   * here (`slugify.util.ts` keeps `#` precisely so `C#` cannot collapse into `c`
   * and collide with the C language tag), and the truncation was verified against a
   * built server rather than inferred.
   *
   * It now lives in `src/proxy.ts`, which encodes the slug itself and also drops
   * the query string instead of passing `?tag=` along to the destination. The rule
   * this leaves behind: **a config redirect is for a destination built from fixed
   * strings; anything carrying request input into a path belongs in the proxy.**
   */
  htmlLimitedBots: new RegExp(
    `Googlebot|${NEXT_DEFAULT_HTML_LIMITED_BOTS}`,
    "i",
  ),
};

export default nextConfig;
