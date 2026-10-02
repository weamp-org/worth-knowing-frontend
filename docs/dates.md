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

That is the whole surface for **date-only** display, and which helper a call
site uses is a product decision, not a preference. Five call sites want the date
alone:

| Call site | Renders |
| --- | --- |
| `src/components/resource-card.tsx:29` | the feed's per-card date |
| `src/app/resources/[id]/page.tsx:85` | `Shared {date}` |
| `src/components/collection-card.tsx:33` | `Created {date}` |
| `src/app/collections/[id]/page.tsx:83` | `Created {date}` |
| `src/app/u/[username]/page.tsx:123` | `Joined {date}` |

A time in any of those is noise. A feed card reading `2 Oct 2026, 14:32` tells a
reader nothing they wanted, and `Joined` wants a day, not an hour.

The `Intl.DateTimeFormat` instances are built once at module scope rather than
per call. Constructing one is not free, and there is no reason to pay it on
every render.

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

## With a time

```ts
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : `${DATE_FORMAT.format(date)}, ${formatTimeUtc(date)}`;
}
```

Renders `2 Oct 2026, 2:32 PM`. Seconds are deliberately omitted — on a triage
surface they are noise, and a value that changes while a moderator reads the
queue is a value they cannot trust. The hour is unpadded and 12-hour, per
convention for a wall-clock time shown alongside a date.

### Why the time is not a second `Intl.DateTimeFormat`

The obvious version is one more `Intl.DateTimeFormat` with `hour`, `minute` and
`hour12: true`. It is wrong in two ways that only show up as hydration errors,
which is the same hazard the rest of this file exists to avoid.

1. **The meridiem case is the locale's business, not ours.** Under `en-GB`,
   `hour12: true` renders `2 Oct 2026, 02:32 pm` — lowercase, because that is
   what `en-GB` does. There is no option to force the case.
2. **The separator before the meridiem differs by ICU build.** Node 24 emits
   U+0020; newer V8 and Safari have shipped U+202F (narrow no-break space) for
   this position. Both render identically on screen and neither is visible in a
   screenshot, so the mismatch between server and browser is easy to miss and
   annoying to diagnose.

So `formatTimeUtc` reads the UTC hours and minutes off the `Date` and builds the
string directly. That pins the case, the separator, and the padding in our code
rather than in whatever ICU the machine happens to ship, at the cost of one
template literal. Reusing `DATE_FORMAT` for the date half keeps the two helpers
visually consistent for free.

The one trade: hour-of-day padding is now our choice rather than a locale
default, so `2:32 PM` and `12:05 AM` sit side by side. That is intentional —
the meridiem removes any 12-vs-24 ambiguity, and the unpadded form is the
conventional one.

Used where **when within the day** is the information being asked for:

| Call site | Renders |
| --- | --- |
| `src/components/resource-report-queue.tsx:191` | `reported {datetime}` |
| `src/components/comment-report-queue.tsx:199` | the comment's own timestamp |
| `src/components/comment-report-queue.tsx:203` | `reported {datetime}` |

Moderation is the one surface in the app where a date alone is insufficient.
`reported 2 Oct 2026` cannot separate a report that arrived an hour ago from one
that has sat for a week, and cannot say which of two same-day reports came first.
On the comment queue both timestamps carry a time, because the *gap* between them
is the signal: a comment flagged minutes after it was written is a live problem,
one flagged three weeks later is a cold backlog item.

### Absolute, not relative

`formatDateTime` is not `Intl.RelativeTimeFormat`, and should not become it
without thinking. A relative string is a function of `now`, so the server render
and the client hydration compute it microseconds apart and disagree — a hydration
error on every row, worsening as the minute rolls over. The pinning that makes
`formatDate` deterministic is exactly what a relative format gives up.

Relative time is still reachable post-hydration behind a mount gate. That is more
machinery than a queue needs; treat it as a deliberate step, not a cleanup.

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

For two format strings and eight call sites, that is a clear loss.

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

## Comments are the open case

`src/components/comment-section.tsx:341` is the one site still on a bare date,
and it is genuinely arguable either way. In a thread where several replies land
the same day, every row reads `2 Oct 2026` and the conversation has to be
followed by scrolling; a comment from twenty minutes ago is indistinguishable
from one from yesterday.

It was left on `formatDate` because the case is weaker than the queues' — nobody
is triaging a comment thread, and a wall of timestamps makes a conversation
harder to read rather than easier. Worth revisiting if replies ever get long
enough that ordering becomes hard to follow.
