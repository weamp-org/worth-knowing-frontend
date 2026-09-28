# Resources

How the frontend talks to the backend's resource API, and why the split between
Server Components and client components falls where it does.

## Routes

| Route                     | Renders                | Auth                        |
| ------------------------- | ---------------------- | --------------------------- |
| `/`                       | Feed, newest first     | Public                      |
| `/?tag=<slug>`            | Feed filtered by tag   | Public                      |
| `/resources/[id]`         | One resource           | Public                      |
| `/resources/[id]/edit`    | Edit form              | Owner only                  |
| `/share`                  | Share form             | Signed in                   |
| `/settings`               | Your preferences       | Signed in                   |

## Reads are Server Components, writes are client components

Every backend call goes through the shared Axios instance in `src/lib/api.ts`.
That instance is the whole point: `AuthTokenSetter` registers a request
interceptor on it that attaches the Clerk JWT, so a bare `fetch` or a second
Axios client would be silently unauthenticated.

That splits cleanly, because the backend splits too:

- `GET /resources` and `GET /tags` are `@Public()`. Server Components can call
  them without a token — the interceptor only ever exists in the browser bundle,
  and a server-to-server request is not subject to CORS at all.
- `POST` and `PATCH /resources` sit behind `ClerkAuthGuard`, so they have to
  come from the browser, where the interceptor is installed.

| File                       | Role                                                        |
| -------------------------- | ----------------------------------------------------------- |
| `src/lib/resources-api.ts` | One function per endpoint, all on the shared instance       |
| `src/lib/resource-queries.ts` | Server-only reads, incl. `notFound()` and per-request dedupe |

### `force-dynamic`

Every route that reads the backend sets `export const dynamic = "force-dynamic"`.
`pnpm build` runs without the backend up, so a route that tried to fetch during
the build would fail the whole build. It also means arriving at a resource page
always re-fetches it, which is why the share form's `router.push` needs no
`router.refresh()` behind it.

### Cursor pagination

`GET /resources` is keyset-paginated and returns `{ items, nextCursor }`, not a
bare array. The feed is the one client component in the read path:

- The Server Component fetches page one and passes it down as props, so the feed
  is server-rendered on load.
- `ResourceFeed` owns the accumulated `items` and `nextCursor`, and **appends**
  the next page on "Load more".

Appending rather than replacing is the reason this is a client component at all.
A `?cursor=` link would be a handful of lines shorter, but clicking it would
swap page one for page two. The cursor never reaches the URL.

The parent sets `key={tag}` on `ResourceFeed`, so changing the filter remounts it
and drops the accumulated pages — otherwise the feed would show page two of the
previous tag underneath page one of the new one.

## Hydration

Cards render inside that client component, so every value they show is rendered
twice — once by Node, once by the browser. `src/lib/format.ts` therefore pins
`Intl.DateTimeFormat` to `en-GB` and `timeZone: "UTC"`. A bare
`toLocaleDateString()` resolves against the machine's zone with whatever ICU
data it ships, which differs between Node and the browser, and the mismatch
surfaces as a hydration error.

## Forms

Built from React Hook Form + Zod with the `Controller` and `Field` components,
per <https://ui.shadcn.com/docs/forms/react-hook-form>. Notably **not** the older
`FormField` / `FormItem` / `FormMessage` wrappers — `src/components/ui/form.tsx`
has been removed as unused.

`src/lib/resource-form-schema.ts` mirrors `CreateResourceDto`. Two notes:

- **`url` is stricter than `zod.string().url()`.** The DTO validates with
  `require_protocol` and `require_tld`, so `localhost:3000` and `foo:bar` are
  rejected. `z.url()` accepts both, so the schema adds a hostname check on top.
- **Tag validation is shape-only.** The backend NFKD-folds accents (`café` →
  `cafe`) and rejects Cyrillic, Greek, and CJK with its own message. That folding
  is not reimplemented here. The client checks length and emptiness; when the
  backend rejects a tag, its message is surfaced verbatim as a form error.

`accessType` is not in the schema. The form does not ask for it, and the backend
defaults it to `UNKNOWN`.

Browser validation stays on (`required`, `type="url"`). The shadcn demo
disables it deliberately to show off schema errors; the docs recommend against
that in real code.

`TagInput` is a plain chip input, not a typeahead. The backend has `GET /tags`
ready for one — it is also what backs the feed's filter pills — and the share form
now uses it. See below.

## Tags

`TagInput` is a combobox over `GET /tags?query=`, which the backend built for this
and had left unused. As the contributor types, it debounces for 200ms and offers
matching tags with how many resources carry each, so an existing tag gets reused
rather than a near-duplicate created.

**Identity is the slug, not the string.** The backend folds tags before slugifying
(`café` → `cafe`), so the input compares on the slug rather than case-insensitively
on the raw text. A plain comparison let "Café" and "cafe" through as two chips,
which the backend then silently collapsed into one — the contributor saw a tag
disappear with no explanation.

`src/lib/tag-slug.ts` restates the backend's folding so the input can dedupe and
preview correctly. It is a preview, not an authority: the backend re-slugifies
whatever it receives, and nothing downstream trusts the local value.

**Creating a new tag is still allowed**, and the dropdown says what it will become
(`New tag /machine-learning`). That teaches the folding rule and shows the tag as it
will appear in a URL, rather than having it happen invisibly on submit.

**An unsupported script says so.** Cyrillic, Greek and CJK cannot be folded, and
the backend rejects them with its own message. The input detects that up front and
explains it, instead of showing an empty slug preview that would read as a bug.

Keyboard: arrows move, Enter selects the highlighted row (or commits the draft as a
new tag), Escape closes, Backspace on an empty field removes the last chip. Options
carry `tabIndex={-1}` so Tab does not walk into the list — focus stays on the
input, which points at the active row with `aria-activedescendant`.

A failed suggestion lookup is swallowed. Free text has always worked, so a network
blip should not turn tagging into a dead end.

## Anonymity

A contributor can share anonymously, with a standing preference in settings and
an override on each resource.

`User.anonymousByDefault` is the preference; `Resource.isAnonymous` is the
**resolved** value, written once at creation. That is deliberate: changing the
default in March must not rewrite what was shared in January, because silently
flipping a past contribution from named to anonymous is worse than either
choice.

The share and edit forms show the toggle pre-filled from the preference. It is
always visible rather than hidden behind an "ask me" mode, because the point is
to decide at the moment of sharing, in either direction.

### What a public response reveals

For an anonymous resource, `contributor` **and** `contributorId` both come back
null. Keeping the id would defeat the feature: it is the same on that person's
public contributions, so anyone comparing two posts could link the anonymous one
back to a name. There is nothing left to correlate on.

`isAnonymous` stays on the response. Without it a client cannot tell an
anonymous contribution from one whose contributor deleted their account — two
different states, worded differently in `src/lib/contributor.ts`. Calling a
departed contributor "anonymous" would be quietly untrue.

### Why the edit page passes a token

Reads are Server Components with no session, so an anonymous resource arrives
redacted and its `contributorId` is null — which would lock the owner out of
their own resource. `getResourceForViewer` forwards a server-side Clerk token so
the backend returns the real payload to the owner and the redacted shape to
everyone else, including other signed-in users.

`EditResourceLink` is a small client component that calls
`GET /resources/:id/mine` before showing an edit link, because the server-
rendered page cannot answer that question on its own. It renders nothing until
the answer arrives, so an edit link never flashes on somebody else's resource.

## 404s

A missing resource returns a real **404** with the 404 page rendered. It did not
at first, and the reason is worth keeping.

A `loading.tsx` at the app root wraps every route in a Suspense boundary, and
Next starts streaming the response as a 200 the moment it can. A `notFound()`
raised after that cannot change the status — it has already gone out on the
wire — so missing resources answered 200 and were kept out of search results only
by the `<meta name="robots" content="noindex">` that Next injects in that case.

The root `loading.tsx` is gone. The boundary is now scoped to the routes that
want one: the feed sits in a `(feed)` route group, and `share/` and `settings/`
each have their own. `/resources/[id]` and `/resources/[id]/edit` are the two
routes that call `notFound()`, and they are the two with no loading boundary, so
their status can still be set. See the note on `PageLoading`.

Two earlier theories were wrong, in case they come up again: it was not Clerk's
proxy (stripping the proxy and Clerk entirely still gave 200), and it was not
`force-dynamic` (removing it still gave 200).

## Known gaps

**Nothing exposes the caller's role.** `DELETE /resources/:id` is admin-gated,
but no endpoint returns the caller's role, so the frontend cannot know when to
offer a delete button. Adding one is a product decision as much as an API one —
should admins delete anyone's resource, or should there be a report/soft-delete
path for ordinary contributors? Worth settling before the endpoint is written.

The ownership gaps that used to be listed here are closed: `PATCH
/resources/:id` is now owner-or-admin, and `PATCH /users/:id` is admin-only with
a separate `/users/me/settings` route for a user's own preferences. That was not
optional polish — with anonymity in place, either gap would have let one account
un-anonymise somebody else's contribution or rewrite their preference.

## Types

The two packages are independently versioned with no shared types package, so
`src/lib/resource-types.ts` is hand-maintained against:

- `worth-knowing-backend/prisma/schema.prisma` — `ResourceType`, `AccessType`
- `worth-knowing-backend/src/resources/dtos/resource-response.dto.ts`
- `worth-knowing-backend/src/tags/dtos/tag-response.dto.ts`
- `worth-knowing-backend/src/resources/dtos/create-resource.dto.ts`

Enum values and validation limits are restated there so a backend change that is
not mirrored shows up as a type error rather than as a rejected request.

Two client files deliberately restate a backend rule: `src/lib/tag-slug.ts`
mirrors the tag folding, and the anonymity default is resolved client-side only
to pre-fill a checkbox. Neither is authoritative — the backend re-derives both —
but they are the kind of mirror that drifts if nobody says so.

## Vendored components

`src/components/ui/` is Biome-ignored — do not reformat it. Components are
added with the CLI and removed by hand when they fall out of use:

```bash
pnpm dlx shadcn@latest add <component>
```

`src/components/ui/form.tsx` and `dialog.tsx` were removed as unused. The CLI
will happily reintroduce them, so re-check before committing a vendor bump.
