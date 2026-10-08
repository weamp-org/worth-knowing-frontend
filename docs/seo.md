# SEO

How Worth Knowing is built to be found, and why each decision is the one it is.

## What the asset actually is

**A specific resource, plus the contributor's reason for believing it is worth
knowing.**

That pairing is the whole product, and it is worth being precise about what it
means for search. A search engine can already return the course, the book, the
paper, the dataset. Google is good at that and will keep getting better at it. What
it cannot return is *why a particular person thought this was worth your time* —
and that is the only part worth Knowing contributed.

So the search strategy follows the thesis rather than a generic playbook:

- `/resources/[id]` is the money page. It is the one URL where the pairing exists.
- Tags are the second surface, because `<topic>` plus implied judgement is the
  long-tail query shape (`is this worth reading`), and no competitor ranks for it.
- Profiles are the third, because *whose* judgement is the differentiator against a
  directory.
- `/browse` and every search state are **not** assets. They are an internal tool.
  Indexing a search-results page would make this site a thin SERP competing with
  the very resources it recommends.

## Indexability

`src/app/layout.tsx` sets `robots: { index: false, follow: true }` as a **root
default**. Most pages on this site are somebody's saved list, a settings form, or
an edit form. Six routes opt back in explicitly:

| Route | Indexed | Canonical |
| --- | --- | --- |
| `/` | yes | `https://worthknowing.weamp.org` |
| `/browse` (no params) | yes | `/browse` |
| `/browse` with any of `q`/`tag`/`type`/`accessType`/`sort` | **no** | none |
| `/resources/[id]` | yes | `/resources/[id]` |
| `/collections/[id]` | yes | `/collections/[id]` |
| `/u/[username]` (public) | yes | `/u/[username]` |
| `/tags/[slug]` | yes | `/tags/[slug]` |
| `/contributors` | **no** | none |
| everything else | **no** | none |

A default-deny with six overrides is one file rather than fourteen edits, and it
means a new route is non-indexable by default rather than indexable by omission.

### Why `noindex` and not just `robots.txt`

`src/app/robots.ts` disallows the authenticated routes and `/browse?q=`, and both
mechanisms are in place because they do different jobs:

- **`Disallow`** saves crawl budget. It stops a crawler spending requests on pages
  it should not index. It does **not** prevent indexing: a URL that is linked from
  anywhere can still be indexed, just without a snippet.
- **`noindex`** is what actually keeps a page out of results, and it is honoured by
  search engines in a way `robots.txt` is not.

`follow: true` accompanies every `noindex`, so a crawler reading a link on a
non-indexable page still follows it onward to one that is.

### Why `/browse` is split rather than blanket-`noindex`

`?q=` is free text up to 100 characters and combines freely with four other
parameters, so the space of search URLs on this domain is effectively unbounded and
every one returns 200 with a list. Left indexable, a crawl walks an infinite
duplicate space.

The filtered and sorted states are the same content as the unfiltered page under a
different order. Self-canonicalising each would tell a crawler every one is a
distinct page worth storing; canonicalising them all to the bare route would claim
the filter view has no existence of its own. **`noindex` is the honest third
option** — the route is one page, and the states are views of it. No separate
canonical URLs are created for search or sort states, because there is nothing
indexed for a canonical to consolidate.

The decision is made in the page's `generateMetadata` rather than in static
`metadata`, because it depends on `searchParams` and static metadata cannot read
them.

### Why `/contributors` is `noindex`

It is about repository commit history — two outbound links to GitHub contributor
graphs — under a title reading "Contributors — Worth Knowing". On a product whose
proposition is curation by identifiable people, that is the wrong occupant of the
phrase, and it links zero times into the product. It is also the only in-app footer
link besides WeAMP, making it the site's second-most-linked page, which is what
made it worth acting on rather than ignoring.

Rebuilding it into a real contributor hub would be a genuine improvement and a
**product** feature. Deferred, not half-done.

## The canonical origin

`NEXT_PUBLIC_SITE_URL` is the single source, consumed by `src/lib/site.ts`.

**It has no fallback, deliberately.** A defaulted value here would be a silent way
to ship localhost canonicals: `metadataBase` would resolve, the build would pass,
and every canonical and OG URL would point at `localhost:3001` in production —
failing invisibly and only after deploy. `siteUrl()` returns `null` instead, the
layout falls back to relative metadata, and Next then raises at build time for any
absolute URL-based field. A missing variable fails the build rather than the
search engine.

Everything absolute is built from it: `metadataBase`, the sitemap, canonical URLs,
Open Graph URLs, the `robots.txt` sitemap declaration.

## Sitemap

`src/app/sitemap.ts`. Load-bearing rather than housekeeping, because **the corpus is
otherwise unreachable to anything that does not execute JavaScript**:

- There is no `/resources` index route.
- `GET /resources` is keyset-paginated with an opaque `base64` cursor, and a
  `?cursor=` value is never an `<a href>` anywhere — only the client
  `ResourceFeed`'s "Load more" button advances it.
- The homepage bounds itself to six recent resources and links to `/browse`, whose
  page two needs JavaScript.

A crawler following links saw roughly six recent, six most-saved and one random,
and then the site ended.

It uses **existing public endpoints** — `GET /resources` and `GET /collections` are
both `@Public()` and already keyset-paginated with a 100-row ceiling — so a few
thousand rows is tens of requests and no sitemap-specific backend API was added.
Deliberately absent: authenticated routes, private collections and profiles, search
and filter URLs, `/?tag=…`, and `/contributors`. Listing a `noindex` URL is a
contradiction; listing a private one is a leak.

**Profiles are the one gap.** There is no public user listing, and adding one
purely to feed a sitemap would be a new public enumeration surface with no product
reason. Profiles are still discovered: every named resource links its
contributor's profile, and every resource is in the sitemap, so the hop is one
click rather than none.

`lastModified` uses `updatedAt` for resources and collections, and is **omitted for
tags** — the tag read returns no timestamp, and inventing "now" would make every
tag look like it had just changed, which is the signal that makes a crawler ignore
the field.

`dynamic = "force-dynamic"`, because a metadata route with no request-time API is
prerendered at build and the build runs without the backend up. Same constraint, and
same reason, as every page in this app.

## Descriptions

`src/lib/description.ts`, used by resource and collection metadata and by both OG
images.

`why` is allowed to be 5,000 characters, so it is truncated — but **on a word
boundary, with an ellipsis only when something was removed**. The old
`.slice(0, 160)` produced snippets like *"the clearest explanation of how human
institu"*, cut mid-word and reading as broken. The snippet is often the only place
a reader meets the reasoning before deciding whether to click, so it is the most
valuable 160 characters on the site.

The budget bounds the **returned** string including the ellipsis, which is what a
snippet budget means and what `slice` got wrong.

## Open Graph

`src/app/opengraph-image.tsx` is the site default; `resources/[id]/opengraph-image.tsx`
overrides it for resources. Next resolves the more specific file.

**A resource card carries the contributor's `why`, not the wordmark.** The resource's
title and link already exist everywhere else — the recipient can read the site name
in the URL — and the reason is the one thing that exists only on the page and in the
card. A card reading "Worth Knowing" would spend the one impression that could have
carried a person's reasoning on advertising a name the reader already has.

**No contributor is ever named, and there is no branch that could.** Whether a name
is attached is a decision the contributor makes per resource, and
`getCachedResource` is the *public* read, so an anonymous contribution arrives
already stripped. There is deliberately no code path that prints a name — stronger
than checking a flag, and why the three byline states this app distinguishes so
carefully cannot be collapsed by an image renderer.

Fonts are bundled, not fetched per request: `src/app/_og-fonts/` carries the
`latin` `ttf` subsets of the app's own faces (`Instrument Serif` for headlines,
`Inter` for everything else — the same faces `layout.tsx` loads), and
`src/lib/og.ts` reads them once and reuses them. `next/og` cannot read the app's
CSS, so without this the cards would fall back to its default sans and look
like a template rather than the app. The blue rail, mark and footer bar use the
brand blue sampled from the app icon, and nothing on either card is uppercased
by CSS — `WeAMP` is set in its natural case.

## Structured data

Only what is **true**, and only two types:

- **`CollectionPage` + `ItemList`** on a public collection. A collection genuinely is
  a curated list with a stated reason for the grouping — the schema calls
  `description` load-bearing — so this describes the page accurately.
- **`ProfilePage` + `Person`** on a public profile, guarded on a claimed handle. A
  `Person` whose `url` 404s is an identity invented for a page that does not exist.

**Never `Course`, `Book`, `Article`, `VideoObject`, `LearningResource` or `Dataset`
for a shared resource.** Each asserts facts about the *linked* resource — provider,
instructor, duration, edition, ISBN — and this page has none of them. It has a title
the contributor typed and a reason they wrote. Emitting a `Course` would claim
`provider` and `hasCourseInstance` for somebody else's course, competing with the
actual provider's page. The product curates; it does not republish.

**An anonymous contribution never carries an author or a `Person` node.** The app
distinguishes "Shared anonymously" from "Shared by a contributor who has since left"
in three separate places, and structured data must not flatten that.

A collection's curator is emitted as `about`, not `author` — a curator did not write
the contributions in the collection.

`src/lib/structured-data.tsx` escapes every `<` as `<` before embedding. A JSON-LD
block is raw text, `JSON.stringify` does not escape `<`, and `title`, `description`
and a person's `name` are all user-supplied — so a contributor could otherwise write
`</script>` and break out of the element.

## `htmlLimitedBots`

Low-priority hardening, in `next.config.ts`. `Googlebot` is added to Next's own
pattern.

**The default alternation is preserved in full, and that is the load-bearing part.**
`htmlLimitedBots` *replaces* the default rather than extending it
(`streaming-metadata.js` resolves `htmlLimitedBots || HTML_LIMITED_BOT_UA_RE`), so
`/Googlebot/` alone would silently regress Twitterbot, `facebookexternalhit`,
Slackbot, LinkedInBot, Discordbot, `applebot`, Bingbot, DuckDuckBot, Yandex and the
`-Google` variants — trading every working social preview for one addition. The
pattern is copied verbatim from the installed `html-bots.js` and kept as a string so
a future Next upgrade can be checked against it.

### Why `Googlebot` is not on the default list

Verified against the installed 16.3.6 by running the compiled regex against real
user agents. Both Google alternatives require a **hyphen** (`Mediapartners-Google`,
`Google-InspectionTool`), so bare `Googlebot/2.1` matches neither.

### What was actually observed, honestly

Every public route is `force-dynamic`, so the question is whether `generateMetadata`
streams into the body instead of blocking the render. **It does not, for any user
agent tested** — `browser`, `googlebot`, `twitterbot`, `facebookexternalhit`,
`slackbot`, `bingbot` and `gptbot` all received `<title>` and `<meta
name="description">` inside `<head>` before this change was added. Responses differ
between user agents only in React's streaming markers, not in metadata placement.

So this configuration is currently **inert for this app**. It is defence in depth
against a Next upgrade or a route restructure changing that behaviour, it costs
nothing here (`getCachedResource` is already `cache()`d, so blocking metadata adds
no request), and it is verified harmless. Next's own position is that it does not
matter — metadata is "appended to the `<body>` tag" and is "interpreted correctly by
bots that execute JavaScript and inspect the full DOM (e.g. `Googlebot`)" — but the
two readings of a JS-injected `<title>` differ between Next and Google's own
guidance, and this removes the question.

Human browsers are unaffected either way: blocking metadata waits on
`generateMetadata` before streaming, which costs latency only for the bots on the
list.

## `/?tag=` → `/tags/[slug]`

A **308**, in `src/proxy.ts`.

**Why the proxy and not `next.config.ts` redirects:** a config redirect was tried
first and **silently truncated any slug containing `#`**. The `has` capture group is
decoded when read out of the query string but is not re-encoded when substituted
into the destination, so `C#` became `/tags/c` — a different tag, or nothing. That
slug is real here; `slugify.util.ts` keeps `#` precisely so `C#` cannot collapse
into `c` and collide with the C language tag. Verified against a built server.

The rule this leaves behind: **a config redirect is for a destination built from
fixed strings; anything carrying request input into a path belongs in the proxy.**

It also cannot live in a page component, because `(feed)/loading.tsx` puts the
homepage behind a Suspense boundary and a `redirect()` raised after streaming has
begun becomes a client-side navigation rather than an HTTP status.

308 rather than 307 because this will never need reversing: the slug is documented
in the backend as permanent identity.

## Tag pages

`/tags/[slug]` is a real public route, not a filter. The reasoning is in the page's
own comment; the SEO-relevant parts:

- **The 20-tag navigation cut is preserved** and stays a cut — that is what the
  count beside each chip is for. It is the *vocabulary* that is no longer capped:
  `GET /tags?limit=` exists so the sitemap can enumerate all 39 tags while the nav
  still shows twenty.
- **Exact slug lookup, not the nav's substring search.** This page is
  self-canonical, so two tags answering to one URL means one of them ends up holding
  the other's canonical identity.
- **Pagination is a real `<a href>`,** which is the one place in this app it is. Every
  other list pages through a client `ResourceFeed`, right for a reader and wrong for
  a page whose job is to be found — a tag with four hundred resources has forty
  crawlable pages.
- `Suspense` wraps **only the list**, so a missing tag still returns a real 404
  status rather than a 200.

## Known gaps

- **`/u/[username]` returns HTTP 200 for a 404**, because its `loading.tsx` puts it
  behind a Suspense boundary before the status is decided. Next injects
  `noindex`, so there is no indexation risk, but crawlers record a soft 404.
  Deliberate and documented in `docs/profiles.md` — a private profile 404s by
  design, so it is *always* a legitimate soft 404. Fixing it costs a backend round
  trip on every profile view for crawl-budget points a small site does not need.
- **No image sitemap.** The only owned images are the brand icons and the
  generated OG cards, neither of which belongs in a sitemap.
- **AI crawlers (`GPTBot`, `PerplexityBot`, `ClaudeBot`) are not on the bot list.**
  Adding them is a referral-source decision rather than a search-engine one, and is
  not in scope for V1.

## Icons

`src/app/favicon.ico` (16/32/48), `src/app/icon.png` (32×32) and
`src/app/apple-icon.png` (180×180) — the "WK" monogram on brand blue. They live
as Next file-convention routes rather than in `public/`, so the `<link>` tags are
emitted automatically with hashed URLs instead of being hand-maintained in
metadata.

What was deliberately **not** kept from the conventional favicon set:

- `favicon-16x16.png` / `favicon-32x32.png` as separate files — the `.ico`
  already contains both sizes, so standalone copies would be a second source of
  the same pixels.
- `android-chrome-192x192.png` / `android-chrome-512x512.png` — these are only
  referenced from a web manifest, and there is no manifest. Re-add them together
  with `manifest.ts` if installability ever becomes a product goal; until then
  they would be unreferenced files.
- No `mask-icon.svg` for Safari pinned tabs — same reasoning, no monochrome
  variant of the mark exists yet.

`themeColor` in the root layout mirrors `--background` per color scheme, so the
mobile browser chrome reads as an extension of the page.