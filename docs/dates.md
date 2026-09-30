# Dates

**We do not use a date library.** Dates go through the platform `Intl` API, and
all display formatting lives in one function: `formatDate` in
`src/lib/format.ts`. This note records why, so the decision does not get
re-litigated every time someone reaches for date-fns.

## What we use today

```ts
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DATE_FORMAT.format(date);
}
```

That is the whole surface — one helper, one format string, five call sites:

| Call site | Renders |
| --- | --- |
| `src/components/resource-card.tsx:29` | the feed's per-card date |
| `src/app/resources/[id]/page.tsx:69` | `Shared {date}` |
| `src/components/collection-card.tsx:33` | `Created {date}` |
| `src/app/collections/[id]/page.tsx:83` | `Created {date}` |
| `src/app/u/[username]/page.tsx:123` | `Joined {date}` |

The `Intl.DateTimeFormat` instance is built once at module scope rather than per
call. Constructing one is not free, and there is no reason to pay it on every
render.

The two pinned options are load-bearing, not cosmetic. `toLocaleDateString()`
with no arguments resolves against the machine's time zone using whatever ICU
data that machine ships, and Node's ICU build is not always the one the browser
has. Cards render inside a client component, so every date is formatted twice —
once by Node, once by the browser — and any divergence surfaces as a hydration
error. See the Hydration section of `docs/resources.md`.

The backend has no date formatting at all. Its one timestamp,
`new Date().toISOString()` in `src/filters/global-exception.filter.ts`, is a
structured log field, not a display concern. Do not add a date library there to
change it.

## Why not date-fns

The usual reason to adopt a date library is that relative formatting ("3 hours
ago") is tedious. That reason is weaker than it was: `Intl.RelativeTimeFormat`
ships in every modern browser and in Node 24, so the common case is covered
without a dependency.

The stronger reason is that **date-fns would not remove the hazard the current
helper exists to avoid — it would relocate it.** `format()` in date-fns formats
in the *local* system time zone, so the same ISO string renders as `12 Mar` on
one machine and `13 Mar` on another. That is precisely the hydration mismatch
above. Reproducing today's pinned-zone behaviour in date-fns means reaching for
`formatInTimeZone` from `date-fns-tz`, so the trade is one zero-byte built-in
for two dependencies with the same discipline still required.

For one format string and five call sites, that is a clear loss.

## What would change the answer

Reopen this when one of these becomes real:

1. **Per-user timezones.** The hardcoded `timeZone: "UTC"` is correct but
   impersonal. A contributor in Accra seeing their own contribution as
   "Shared 13 Mar" when it was the 12th locally is a real bug. Personalised
   display is the case that genuinely needs `formatInTimeZone` (date-fns-tz),
   `Temporal`, or a stored user preference — pick one, but only once a profile
   setting exists to read it from.
2. **Date arithmetic** — filtering by recency ("from the last 7 days"), or a
   date picker.
3. **Durations** — if streak or subscription mechanics ever land, and something
   needs to render an elapsed span.

Until one of those lands, add the format to `src/lib/format.ts` and keep using
`Intl`.
