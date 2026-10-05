# Saved resources

A bookmark with no grouping attached. One click on a resource and it lands on
`/saved`.

Mirrors the backend's [saved doc](../worth-knowing-backend/docs/saved.md). This
page covers only what is frontend-specific.

## Routes

| Route | Access | Notes |
| --- | --- | --- |
| `/saved` | `auth.protect()` | Your saved resources, newest saved first |

## No `loading.tsx`, and that is load-bearing

`/saved` deliberately has **no** `loading.tsx`, matching `/collections`.

A `loading.tsx` wraps the segment in a Suspense boundary, which makes Next start
streaming the response as a 200 before the page can decide anything. `auth.protect()`
redirects to sign-in, and once streaming has begun the status can no longer be
changed — so a signed-out visitor gets a **200 rendering an empty page** instead
of the 307 they should have been sent.

Verified against a running stack: with a `loading.tsx` `/saved` answered 200 for
a signed-out visitor; without one it answers 307, same as `/collections`.

`/share` and `/settings` still have this problem. They predate the collections
work and are outside this change, but they are the same fix if you want it.

Note this is a *status* problem, not a *privacy* one: `auth.protect()` throws
before the data is read either way, so nothing leaks. A 200 rendering an empty
shell is merely wrong rather than dangerous.

## No cursor pagination here, on purpose

Only the first page, rendered server-side. Adding "load more" would mean a client
component mirroring `ResourceFeed`, and unlike a collection or the feed this is
not something anybody browses in depth — it is a short list you pop into, save
something from, and leave.

The route is already keyset-paginated, so if it does turn out to be long this
becomes a component copy rather than an API change.

## `SaveButton` is SSR'd, for the same reason as the collection picker

The button's whole job is to say whether a resource is already saved. An earlier
control on this page — `CollectionPicker` — fetched its state on open and so read
"Save" for something already saved until you touched it. A client-side cache does
not fix that: on a server-rendered page its best case is "still loading" on
arrival.

So the resource page asks during SSR and passes both values down:

```tsx
const [myCollections, isSaved] = userId
  ? await Promise.all([
      getCachedMyCollections(userId, resource.id),
      getSavedStateForViewer(resource.id, userId),
    ])
  : [null, null];
```

`Promise.all` because the two are independent, and both are gated on `userId` so
a signed-out reader's markup contains neither control. `auth()` resolves during
the render, so nothing ever appears late or corrects itself after hydration.

## The most-saved rail, and what an empty one means

`GET /resources/top-saved` feeds the home page rail — see `docs/resources.md` for
the layout. `listMostSaved` returns a bare `Resource[]`, not a
`PaginatedResources`, and that asymmetry is the backend's rather than an omission.

Two things follow for this side of the wire:

- **No `nextCursor`, no `facets`, no `filters` to carry.** There is no "load more"
  on a rail.
- **A short array is normal and `[]` is a real answer**, not a failure. The
  backend excludes resources nobody has saved, so a young site returns nothing.
  The home page renders no band at all in that case, rather than padding the rail
  with zero-save rows under a "Most saved" heading.

The heading is **"Most saved"**, never "Best". The count is a signal of interest,
not of quality — see the next section.

## The card shows the count; it does not let you save

`ResourceCard` renders `savedCount` as a plain `<span>` reading "5 saved", and
**not** the comment count. Both numbers already arrive on every resource response,
so this is a rendering decision, not a fetching one.

Three choices, all deliberate:

- **Non-interactive.** The feed reports the count; the resource page is where you
  save. Mounting `SaveButton` per card would mean ~20 client components and one
  `GET /saved/:resourceId` each on every feed load, and the optimistic count
  would go stale invisibly — saving in the feed updates that one card while other
  cards showing the same resource keep the old number.
- **The noun is spelled out.** `5` next to a bookmark glyph is a score; `5 saved`
  is a sentence. The shorthand is how a count picks up an implied claim to
  quality, and the point of showing it is to report *interest*.
- **Hidden below 1.** "1 saved" is noise on a card, and "0 saved" is a
  discouraging line under somebody's first contribution.

`commentCount` is left off the card entirely, and that is a product ruling rather
than an omission — see the backend's
[comments doc](../worth-knowing-backend/docs/comments.md). A comment is a
*reaction* to a `why`, so its count describes the conversation rather than the
resource. That is honest attached to the thread itself, which is where the
resource page puts it, and misleading in a feed, where a number next to a speech
glyph reads as a quality score.

## The count comes from the response, not computed locally

`initialSavedCount` comes from `resource.savedCount`, which the backend puts on
**every** resource response. After a save or unsave, the API returns the whole
resource with a fresh count, and `SaveButton` takes that rather than doing
arithmetic — somebody else may have saved it in between, so the local number
would drift.

## Optimistic, with a rollback

Same pattern as `CollectionPicker` and `ProfilePrivacySetting`. A one-click
bookmark with no confirmation that silently did nothing would leave somebody
believing they had kept something when they had not.

## Independent of collections

Deliberately a **separate control**, not nested inside `CollectionPicker`. Saving
is one click with no claim attached; collecting is saying "these belong together".
They never touch each other, so neither is a mode of the other — and unsaving
must not quietly undo somebody having filed a resource somewhere.

## Types

There is **no** `saved-types.ts`. The saved list is `PaginatedResources` and the
save/unsave responses are `Resource`, both of which already exist in
`resource-types.ts`. Inventing parallel types for a subset of an existing shape
would be the same lossless-but-duplicated mistake as `savedCount` being its own
fetch.

`resource-types.ts` gained one field: `savedCount` on `Resource`. Whether *you*
saved a resource is **not** on that shape — it is per-viewer and comes from
`GET /saved/:resourceId`, so a public read and an owner's read can never be
confused.

## Tests

There are no tests in this package. `pnpm lint && pnpm typecheck` is the cheap
check, and `pnpm build` was run because this change added a route, a server/client
boundary, and `auth()` in a Server Component — see
[AGENTS.md](../../AGENTS.md).
