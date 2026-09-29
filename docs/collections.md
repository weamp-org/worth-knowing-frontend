# Collections

A collection is a gathering of resources somebody chose to keep together. The
owner is usually saving links *other people* shared, and each resource keeps its
own contributor's byline — which is why the backend names the relation `owner`
and not `contributor`.

Mirrors the backend's [collections doc](../worth-knowing-backend/docs/collections.md).
This page covers only what is frontend-specific.

## Routes

| Route | Access | Notes |
| --- | --- | --- |
| `/collections` | `auth.protect()` | Your own collections |
| `/collections/new` | `auth.protect()` | Create |
| `/collections/[id]` | Public | One collection and its contents |
| `/collections/[id]/edit` | Owner only | Redirects if not `isOwner` |

A public collection is listed on `/u/[username]`, under the profile's
contributions. That is the **only** discovery surface, and `GET /collections` on
the backend is unopinionated enough to support a global browse later without an
API change.

## The `loading.tsx` rule — do not add one here

`/collections/[id]` and `/collections/[id]/edit` deliberately have **no**
`loading.tsx`, and this is load-bearing rather than an oversight.

A `loading.tsx` wraps its segment in a Suspense boundary, which makes Next start
streaming the response as a 200 before the page can decide anything. A
`notFound()` raised after that point can no longer change the HTTP status, so
every private-or-missing collection would answer **200** and render the 404 body.

Both these pages call `notFound()` — through `orNotFound` in
`collection-queries.ts`, which maps the backend's 404 to the app's 404 page. That
is also why a *private* collection is a 404 on the wire rather than a 403: the
owner declined to confirm it exists, so a real 404 is the honest status, and it
can only be a real one if there is no Suspense boundary above.

`docs/resources.md` records the same analysis for `/resources/[id]`, including
two earlier theories that turned out to be wrong. The remaining
200-instead-of-404 leak is `/u/[username]`, which does have a loading file.

Verified against a running stack: a missing collection and a private collection
viewed by a stranger both return a real 404.

## Where a token is required

The RSC/client split in the project README works because the backend's
`@Public()` routes need no session. Collections mostly fit that, with one
exception that is easy to get wrong.

`getCollectionForViewer` and `getCollectionResourcesForViewer` attach a Clerk
token **when the caller is signed in**:

```ts
const { userId, getToken } = await auth();

if (!userId) return getCollection(id);

return getCollection(id, (await getToken()) ?? undefined);
```

Without it, the backend cannot tell the owner from a stranger and a private
collection 404s for the one person who may see it. The same asymmetry already
exists in `getResourceForViewer` for an anonymous resource.

`getCachedPublicCollections` does **not** do this, and should not: the backend
filters private collections out in the query, so every viewer gets the same
answer and the viewer is not part of the cache key.

## `isOwner` and `profilePath` are never re-derived

Both come from the backend, and both have exactly one client rule — render an
anchor when `profilePath` is a string, render nothing else. Re-deriving
`profilePath` from separate privacy fields in each component would eventually
produce a link to a 404 in one of them, which is the kind of bug that survives
review because it looks right.

`/collections/[id]/edit` is the clearest case: it redirects on
`!collection.isOwner` rather than comparing an id, because the response carries
no id to compare against.

## The picker is on the resource page, not in the share form

`CollectionPicker` sits on `/resources/[id]`. There is deliberately no
"add to a collection" step in `POST /resources`: the central contribution stays
as simple as it was, and a resource is collected afterwards. The backend API is
identical either way, so this was a choice about the share form rather than a
limitation.

It reads `GET /collections/me?resourceId=…`, which answers "does this collection
already hold this resource" for **every** collection in one request rather than
one per collection. The `containsResource` flag is `false` throughout when the
parameter is absent, so only send it when a resource is actually in hand.

Toggles are **optimistic with a rollback**. A one-click toggle with no
confirmation that silently does nothing leaves somebody believing a resource is
saved when it is not — and they find out weeks later. See
`ProfilePrivacySetting` for the same reasoning about a privacy switch.

The panel is `absolute` inside a `relative` wrapper, because the resource page's
actions are a `flex-wrap` row and a plain sibling panel would be laid out as one
more item in it. No `Popover` component is vendored, and the CLI would
reintroduce `ui/form.tsx` and `ui/dialog.tsx` as a side effect of a vendor bump,
so the panel is plain markup.

## `ResourceCard` is reused unchanged

It is isomorphic — it renders in both the RSC and client trees — so every value
it shows goes through `formatDate` to stay deterministic. A resource inside a
collection is a resource, and the byline still shows the original contributor,
which is the point: a collection is somebody's curation, not a claim of
authorship.

`CollectionResourceFeed` is `ResourceFeed` with the `tag` and `contributor`
filters swapped for a collection id. The "load more" decision is the same and
for the same reason: a `?cursor=` link would swap page one for page two, which
reads as a bug rather than as pagination.

## Types live in their own file

`lib/collection-types.ts`, not appended to `resource-types.ts`. That file's header
says it mirrors the *resource* API, and a collection holds resources but shares
almost no shape with one. The one thing worth mirroring is the density of
comments on non-obvious fields — they explain the *server's* decision so nobody
re-derives it.

## Tests

There are no tests in this package. `pnpm lint && pnpm typecheck && pnpm build`
is the verification, and it is what CI runs.

## Not built, on purpose

- No global `/collections` browse. Discovery is the profile page.
- No drag-and-drop reordering. Newest-collected first, and there is no `position`
  on the backend.
- No size caps, and no "create collection" step inside the share form.
- No follow or subscribe. Separate feature.
