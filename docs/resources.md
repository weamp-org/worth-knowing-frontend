# Resources

How the frontend talks to the backend's resource API, and why the split between
Server Components and client components falls where it does.

## Routes

| Route                  | Renders                     | Auth                        |
| ---------------------- | --------------------------- | --------------------------- |
| `/`                    | Feed, newest first          | Public                      |
| `/?tag=<slug>`         | Feed filtered by tag        | Public                      |
| `/browse`              | Search and filter view      | Public                      |
| `/resources/[id]`      | One resource                | Public                      |
| `/resources/[id]/edit` | Edit form                   | Owner only                  |
| `/share`               | Share form                  | Signed in, username claimed |
| `/settings`            | Your preferences            | Signed in                   |
| `/u/[username]`        | A profile                   | Public                      |
| `/settings/profile`    | Username, bio, privacy      | Signed in                   |

## `/browse` — all state is in the URL

`/browse` is the canonical search and filter view. It reads `?q=`, `?tag=`,
`?type=`, `?accessType=` and `?sort=`, and **every one of them lives in the URL**.

That is the design rather than an implementation detail. It makes a filtered view
shareable and linkable, makes the back button step through the filters, and — the
part that matters — leaves no client-side copy of the result set that could
disagree with the controls above it. A navigation re-renders the Server
Component, which fetches page one afresh and remounts the feed.

`src/lib/browse.ts` owns the parameter shape and is the only place that builds
those URLs:

- `browseHref(params)` — builds `/browse?…` with a **fixed parameter order**, so
  two links built from the same state are the same string. Otherwise the browser
  treats a reordered query as a new history entry and back starts feeling
  unreliable. Absent, empty and whitespace-only values are all dropped, so a bare
  `?q=` never becomes a link that reads as a search and renders everything.
- `parseBrowseParams(searchParams)` — narrows the URL to known values.
  `searchParams` is whatever the URL said, so `?type=BANANA` reaches the page;
  forwarding it would be a 400 and an error page, where dropping it is an
  unfiltered browse — what someone following a stale link actually wants.

### The search box navigates rather than filtering in place

`SearchBox` is a real `<form>` whose submit calls `router.push`, landing on
`/browse`. It does **not** filter the feed below it as you type.

Two reasons. A search that is a URL can be shared, bookmarked and reached with the
back button; a search held in component state cannot. And results belong next to
the filters that shaped them.

Enter submits without JavaScript wiring up a key handler, and the browser's own
"search this page" affordances work, because it is genuinely a form.

`carry` holds the tag, type and access level a new search should keep. Those
narrow *which* resources are in scope, and a new search is still inside that
scope. `sort` is deliberately **not** carried: it decides *how* to order results,
and the right order for a new query is usually relevance. Keeping a title sort
across a fresh search would show the matches alphabetically because of a choice
made for a different question.

### The typeahead layers on top of that rather than replacing it

`SearchBox` is also a combobox. It is strictly additive: the form, the submit
button, Enter-with-nothing-highlighted and the browser's own affordances all
behave exactly as they did before the dropdown existed.

It is backed by **the ordinary `GET /resources?q=`** with `limit: 8`, so there is
no new endpoint and the ranking is the same one `/browse` shows. Redaction comes
along for free, because `listResources` is the same call the feed makes — an
anonymous contribution arrives already stripped of its contributor. A narrower
suggest endpoint would have to earn that deliberately.

Accepted cost: each keystroke ships up to eight *whole* resources, contributor
join and `why` included. Worth revisiting only if volume or payload actually
shows up as a problem. Related: the global throttle is 100 req/min tracked by
`req.user?.id ?? req.ip`, so all anonymous visitors share one bucket and a
typeahead is a 10–12x amplification. Left alone for now, deliberately.

**Enter means two different things, and that is the whole design.** With a row
highlighted it goes to `/resources/:id`; with nothing highlighted it runs the
search and lands on `/browse?q=`. So `highlighted` starts at `NO_HIGHLIGHT` (`-1`)
rather than `0` — defaulting to `0` would make the very first Enter on a fresh
query jump to a resource nobody picked. Changing the query resets the highlight
back to `NO_HIGHLIGHT`, which is what restores the second meaning.

The trailing **"See all results"** row exists so the search destination is one
click rather than keyboard-only. It targets the same URL as a bare Enter, so the
two are interchangeable rather than subtly different paths.

### Why the typeahead debounces harder than `TagInput`

`TagInput` waits 200ms, this waits **300ms**, and the minimum query is **three**
characters rather than two.

The two lists are not siblings despite looking like it. A tag is a short controlled
vocabulary you are confirming an exact name for, so the answer is worth having
immediately. Search is exploratory — you type, misjudge, backspace, revise — and
the backend allows 100 requests a minute **tracked by `req.user?.id ?? req.ip`**,
so every signed-out visitor behind one wifi draws from a shared bucket. Requests
only fire once typing has paused past the delay, so raising it is the cheapest way
to send materially fewer.

Three characters is also where the backend's fuzzy matching becomes available at
all, since `word_similarity` needs a trigram. Below that a needle degenerates into
`ILIKE '%a%'` over the whole corpus — slow, and matching most of the site, so noise
rather than help — and skipping it saves the first request or two of every search.

**The throttle was left alone deliberately.** 100/min is what stands between a
bored person and a script, and nobody has hit it yet. If throttling ever does
show up, the signature is *suggestions going empty while `/browse` still loads* —
the frontend swallows lookup failures, so it presents as a dropdown that quietly
declines to appear. The fix is already decided: a route-specific allowance for
search, following the `PUBLIC_WRITE_THROTTLE` pattern in the backend's
`throttle.ts` applied to reads. Targeted, leaves the global limit tight.

A lighter `GET /resources/suggest` would **not** be the fix for this — it cuts
payload per request, not the number of requests. Different problem.

### Why the suggestions go through TanStack Query

Because search queries get revised and an effect cannot know what it has already
asked for. Typing `mach`, backspacing to `mac` and fixing it should not spend a
second request on an answer the backend has already given, and going back over
covered ground fills in instantly with no spinner. The provider's 30s `staleTime`
is exactly that window, so nothing is overridden.

Tags mostly get typed once and confirmed, which is why `TagInput` gets away with a
bare `setTimeout` and this cannot.

Stale data is explicitly discarded rather than shown while a new key resolves:
TanStack keeps the previous page visible, which is right elsewhere and wrong here,
because it would list `mach` results under a box that now says `machine`. The
request also takes an `AbortSignal`, so superseded lookups are cancelled instead of
competing for the connection.


A failed lookup is swallowed. Free text has always worked, so a network blip must
not turn the field into a dead end.

Rows are plain text plus the resource type, deliberately **not** `Badge` — `Badge`
is 10px uppercase tracked-out label styling, too loud at dropdown size and reading
as a status rather than a kind of thing. Same reasoning as `TagBadge`'s note.

The ARIA is `TagInput`'s verbatim: `role="combobox"` on the input, a
`div role="listbox"` below it (a `ul` carrying an interactive role is invalid
semantics), `tabIndex={-1}` options so Tab leaves the field, `onMouseDown` to beat
the blur that `onClick` would lose to, and `aria-activedescendant` because focus
never enters the list.

### Anything holding state needs a `key` when the URL can change underneath it

`SearchBox` keeps its value in `useState(defaultValue)`. A changed prop does not
reach it, so "Clear everything" — which navigates to `/browse` and arrives with
no `q` — left the field still showing a search that was no longer filtering
anything. It is keyed on `q`, which is what makes it reset.

Keyed on **`q` alone**, not on the whole URL. Keying on everything is the obvious
move and it is wrong: changing a type filter mid-word would remount the field and
swallow what was being typed. `q` is the only input that should discard typing,
and the only one that can arrive from somewhere other than the keyboard.

`ResourceFeed` has the same hazard and the same answer, keyed on
`browseHref(params)` because *any* filter change invalidates its accumulated
pages. Neither was caught by the build — both type-check, both compile, and both
are only wrong once clicked.

### Relevance is the absence of `sort`

The backend has no `sort=relevance` — relevance is what you get from `q` with no
`sort`, and an explicit sort alongside `q` means "every match, in this order".

So the sort control offers `Relevance` as a real option that **clears** `sort`
rather than writing a value the backend would reject, and only when a `q` is
present. With no search there is nothing to be relevant to.

`Type` and `Access` carry an explicit `Any type` item for the same shape of
reason: Radix has no "no value selected" item, its placeholder is not clickable,
and re-picking the current item does not deselect it. Without one, choosing a
filter would be a one-way door.

### `ResourceFeed` takes `filters`, not individual props

`ResourceFeed` takes one `filters` object — the same shape as
`ListResourcesParams` — and re-sends it on **every** "Load more".

A cursor means nothing without the filters that produced it: relevance paging
carries a `(score, id)` pair rather than a bare id, and every filter has to be
present or page two is page two of the whole site. A prop list invites a call
site to forget one, and that is not hypothetical — the feed used to take `tag` and
`contributor` as separate props, and adding `q` without threading it would have
made page two of a search the entire unfiltered feed.

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

The parent sets `key={tag}` on `ResourceFeed` (and `key={browseHref(params)}` on
`/browse`), so changing any filter remounts it and drops the accumulated pages —
otherwise the feed would show page two of the previous filter underneath page one
of the new one.

A profile's listing is the same component with `filters={{ contributor }}`, and it
carries the filter into the "load more" request. It is the one client component in
the read path, so a filter that was not carried would make page two of a profile
be page two of the whole feed. See `docs/profiles.md`.

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

The site now has two typeaheads — `SearchBox` over resources and `TagInput` over
tags. They deliberately share a debounce, a minimum length and an ARIA pattern, so
they feel like one input; see above and below.

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
