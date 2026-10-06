# Analytics

V1 product analytics: PostHog Cloud EU, frontend-only (`posthog-js`). Answers
which Worth Knowing surfaces lead to resource discovery, what happens after a
resource is found, whether discoverers become contributors, how saves /
collections / comments are used, and whether people return.

## What is collected

Nine domain events plus automatic `$pageview`. Every property is an opaque id,
a closed enum, a bucket, a boolean, or a count:

| Event | When it fires | Properties |
| --- | --- | --- |
| `resource_viewed` | Resource page renders successfully, once | `resource_id`, `source`, `is_authenticated` |
| `search_performed` | A committed `/browse?q=` render loads, once per filter URL | `query_length_bucket`, `has_tag_filter`, `has_type_filter`, `has_access_filter`, `result_count`, `sort`, `is_authenticated` |
| `resource_opened` | Outbound click to the underlying resource | `resource_id`, `location` (`card`/`detail`), `destination_host`, `source`, `is_authenticated` |
| `resource_saved` / `resource_unsaved` | Save API call succeeds | `resource_id`, `source`, `location`, `is_authenticated` |
| `collection_created` | Collection API call succeeds (creations only) | `collection_id`, `is_private`, `had_description`, `is_authenticated` |
| `resource_added_to_collection` | Add-to-collection API call succeeds (adds only) | `collection_id`, `resource_id`, `source`, `is_authenticated` |
| `comment_added` | Comment API call succeeds | `resource_id`, `is_reply`, `is_authenticated` |
| `resource_contributed` | Share API call succeeds (creations only, never edits) | `resource_id`, `resource_type`, `tag_count_bucket`, `is_anonymous`, `is_authenticated` |

`source` is one of `feed | browse | search | tag | profile | collection |
surprise | saved_list | direct | external`.

## What is never collected

No titles, URLs (only destination hostnames), `why` text, comment bodies,
tag names, collection titles/descriptions, bios, emails, names, usernames,
avatars, or any other free text. `before_send` in `src/lib/analytics.ts`
additionally strips query text (including `q`) and profile handles from
pageview URLs, and deletes any non-allowlisted property on the nine events,
so a future edit cannot leak new fields by accident.

No session replay, no autocapture (including dead clicks and heatmaps), no
performance capture (web vitals stay on Vercel Speed Insights), no surveys,
no feature flags. Vercel Analytics remains the performance source; PostHog is
the product-behavior source.

## Identity

Anonymous visitors keep PostHog's anonymous id (`person_profiles:
'identified_only'`, so no person profile exists until sign-in). On sign-in,
`AnalyticsIdentity` calls `posthog.identify()` with the Clerk user id and no
properties — zero custom person properties, by policy. Anonymous history
merges automatically. Sign-out calls `posthog.reset()`; anonymous mounts
never do, so the anonymous journey is not fragmented.

An anonymous contribution stays anonymous in analytics: only the
`is_anonymous` boolean travels, never a handle.

## Attribution

`src/lib/analytics.ts` holds an ephemeral store (in-memory plus
`sessionStorage`, consumed once per view). Listing links record their surface
on click; the detail view consumes it. No query parameters, no super
properties, no persistent storage. A new tab or reload reports `direct`.

## Opt-out

Analytics is on by default. `Settings > Usage analytics` (`AnalyticsSetting`)
opts out of future collection via `posthog.opt_out_capturing()`. Browser Do
Not Track is respected on a best-effort basis (`respect_dnt`). Past events
remain after opting out and are removed on request.

IP capture should stay disabled at the organization and project level (this
is a PostHog dashboard setting, not code). Raw event retention follows the
PostHog plan minimum (one year on Free) — it cannot be shortened — so
minimization above is the privacy mechanism, not a retention setting.

## Environment

```env
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

Without both, `initAnalytics()` no-ops and the app runs untracked. The
backend is untouched: all nine events are captured client-side.
