# Resources

How the frontend talks to the backend's resource API, and why the split between
Server Components and client components falls where it does.

## Routes

| Route                  | Renders                | Auth                        |
| ---------------------- | ---------------------- | --------------------------- |
| `/`                    | Feed, newest first     | Public                      |
| `/?tag=<slug>`         | Feed filtered by tag   | Public                      |
| `/resources/[id]`      | One resource           | Public                      |
| `/resources/[id]/edit` | Edit form              | Owner only                  |
| `/share`               | Share form             | Signed in, username claimed |
| `/settings`            | Your preferences       | Signed in                   |
| `/u/[username]`        | A profile              | Public                      |
| `/settings/profile`    | Username, bio, privacy | Signed in                   |

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

| File                          | Role                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| `src/lib/resources-api.ts`    | One function per endpoint, all on the shared instance        |
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

A profile's listing is the same component with `contributor` set instead of
`tag`, and it carries the filter into the "load more" request. It is the one
client component in the read path, so a filter that was not carried would make
page two of a profile be page two of the whole feed. See `docs/profiles.md`.

## Hydration

Cards render inside that client component, so every value they show is rendered
twice — once by Node, once by the browser. `src/lib/format.ts` therefore pins
`Intl.DateTimeFormat` to `en-GB` and `timeZone: "UTC"`. A bare
`toLocaleDateString()` resolves against the machine's zone with whatever ICU
data it ships, which differs between Node and the browser, and the mismatch
surfaces as a hydration error. See `docs/dates.md` for the full reasoning,
including why we do not use a date library here.

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

The same reasoning is behind `src/lib/profile-form-schema.ts`, and it goes
further: the username rules live in one shared `usernameProblem` function rather
than as zod patterns, precisely because a pattern would have to duplicate the
backend's folding to avoid rejecting `Café` and `AdaL`. See `docs/profiles.md`.

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

### One chip, four places

Every tag on screen is `TagBadge` in `src/components/tag-badge.tsx` — the feed's
filter nav, a card in the feed, the footer of a resource, and the removable chips
in the share form. Use it rather than reaching for `Badge` directly.

It is worth knowing **why**, because the reason is not "consistency, nice".

`Badge` in `ui/badge.tsx` is a `radix-nova` *label* style: `rounded-none`,
`border-0`, `bg-transparent`, `px-0 py-0`, `text-[0.625rem] uppercase
tracking-widest`. None of that is a chip, and a tag rendered with it alone
displays as 10px grey text — indistinguishable from the byline next to it, and
not obviously a link. `TagBadge` layers on `rounded-full border px-2 py-0.5
text-xs` to turn it into something that reads as a tag.

It also drops `uppercase` and `tracking-widest`. Those are right for the system's
own labels (resource type, access type) and wrong for a tag name, which is
vocabulary the contributor typed — `MACHINE LEARNING` misrepresents
`machine learning`. Resource-type and access-type badges should keep using
`Badge` directly; the two are not the same kind of thing.

The filter nav needed a real active state and `Badge` cannot express one. Its
`secondary` and `ghost` variants resolve to `text-muted-foreground` with
`hover:text-foreground`, and `asChild` puts both on the same `<a>`, so the
selected filter looked exactly like the unselected ones. `TagBadge`'s `active`
prop switches to `bg-secondary text-secondary-foreground` with a transparent
border. `href` overrides the filter URL, which is how the nav's "Everything"
reset link wears the same shape.

**Do not pass a callback to it.** `children` replaces the name-plus-link, which
is how the share form's remove button gets in without `TagBadge` becoming a client
component — three of its four call sites are server-rendered and could not import
one.

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

`ResourceActions` is a small client component that calls
`GET /resources/:id/mine` before showing anything, because the server-rendered
page cannot answer that question on its own. It renders nothing until the answer
arrives, so a delete button never flashes on somebody else's resource.

It is **one component with two branches**, not a component per action: Edit and
Remove share one ownership probe, and the Report control is the *other* branch
rather than a fourth control. A report on your own contribution is refused by the
backend, so offering one would be offering something that cannot succeed — and if
you agree with a report about your own post, Remove is the right answer anyway.

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

## Deleting a resource

`DELETE /resources/:id` is contributor-or-admin, and the frontend offers a
**Remove** button beside Edit on your own resource. It deletes immediately and
permanently, for everyone.

That is the only self-service correction the product offers. Before this, the
sole exit was an admin, and there is no admin — `pnpm user:set-role` by hand is
not a moderation system. Sharing something you regret had no remedy, which is a
real failure and an invitation to post defensively.

**The confirmation is the enforcement, not a permission check.** Requiring an
admin to delete your own post is gatekeeping. The dialog instead names the
resource and says plainly that the explanation goes too, which is the part
people would not otherwise expect to lose.

### Why there is no "remove my name" action

It was proposed and dropped as strictly dominated:

| Action              | Name hidden | Can you edit it later | Content stays |
| ------------------- | ----------- | --------------------- | ------------- |
| Share anonymously   | yes         | **yes**               | yes           |
| Remove my name      | yes         | no                    | yes           |
| Delete for everyone | yes         | n/a                   | no            |

Anonymity already hides the name **and** leaves the resource editable. Detaching
the contributor outright would only take away the author's ability to fix a typo
or un-share if the link turns out to be wrong. So the dialog points at
"Edit → Share anonymously" as the middle path rather than offering a third
button — one sentence in the confirmation instead of a permanent new state to
model, word, and explain.

**No soft delete.** No `deletedAt`, no purge job. `AGENTS.md` asks for simple
before complex, and a product with two resources does not need reversible
deletion. Revisit when there is engagement data and a moderation queue worth
protecting. Reporting and flagging are also absent, and are a real moderation
design rather than a missing endpoint.

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
