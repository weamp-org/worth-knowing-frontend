# Profiles

A contributor's public face. This document covers the routes, the split between
what Clerk owns and what we own, and the two privacy mechanisms that are easy to
confuse with each other.

The backend counterpart is `worth-knowing-backend/docs/profiles.md`, and it is
the authority on the rules — everything here is a restatement for the client.

---

## Routes

| Route               | What it is                                           |
| ------------------- | ---------------------------------------------------- |
| `/u/[username]`     | A public profile. `@Public()` on the backend.        |
| `/settings/profile` | Edit username, bio, and privacy. Requires a session. |

`/contributors` is **not** this. That page lists GitHub contributors, and reusing
the word for member profiles would be genuinely confusing.

Both new routes carry a `loading.tsx`, like every other route here. That is also
what puts them behind a Suspense boundary — see "404s and HTTP status" below.

---

## Who owns which field

| Field           | Owned by     | Edited in                 | Sent as                     |
| --------------- | ------------ | ------------------------- | --------------------------- |
| Display name    | Clerk        | Clerk's profile **modal** | `name`                      |
| Avatar          | Clerk        | Same                      | `imageUrl`                  |
| Username        | **This app** | `ProfileForm`             | `username`, `usernameLower` |
| Bio             | **This app** | `ProfileForm`             | `bio`                       |
| Profile privacy | **This app** | `ProfilePrivacySetting`   | `isProfilePrivate`          |

The first two are mirrored from Clerk, not owned. The backend's webhook
overwrites them on every Clerk event, so writing them through our API would be
reverted without warning — which is why `UpdateMyProfileDto` has no field for
either, and the backend's `ValidationPipe` 400s one that is sent.

---

## Why Clerk's UI is a modal, not embedded

`AccountDetails` renders a row — avatar, name, and a **Manage account** button —
and the button calls `clerk.openUserProfile()`.

An earlier version embedded `<UserProfile />` inline on this page. It was wrong
in a way that was not only aesthetic:

- **`<UserProfile />` is a standalone application**, designed to own a whole page.
  Inside a `max-w-2xl` column it rendered cramped and clipped.
- **The colour override was a real dark-mode bug.** Forcing
  `[&_*]:text-foreground` put our foreground onto Clerk's text while Clerk's own
  background stayed fixed — dark text on a light surface in dark mode.
- **It cannot consume our theme.** `docs/theming.md` is explicit that this app's
  theming story is CSS variables. A component with its own fixed palette cannot
  be made to match, and the fight would be permanent.
- **It cost bundle weight** on every visit to `/settings/profile`.

The modal solves all four: Clerk's UI renders inside its own overlay, at its own
width, with its own styling, and only downloads once somebody asks for it.

> **Do not reach for `routing="path"` on `<UserProfile />`** expecting per-tab
> URLs. It requires a catch-all route to host them — extra App Router machinery
> for tabs nobody links to — and the modal needs neither.

### The row reads from Clerk, not from our copy

`useUser()` supplies `fullName` and `imageUrl` directly, so the row is always
live. The mirrored copy on `User` can lag a change by however long the webhook
takes, and a settings page showing a stale name beside a "manage" button is worse
than showing nothing.

The button is disabled while Clerk is still loading, because
`openUserProfile` needs the user object mounted and throws otherwise.

---

## `profilePath`: never re-derive it

A contribution's byline is `ContributorByline`, and it is two lines of logic:

```tsx
if (!profilePath) return <span>Shared by {name}</span>;
return (
  <span>
    Shared by <Link href={profilePath}>{name}</Link>
  </span>
);
```

The backend computes whether a name should link and sends a resolved path or
`null`. Do not reconstruct it from other fields — there are none to reconstruct
it from, because `usernameLower` and `isProfilePrivate` are deliberately absent
from the response. That is the point: a client asked to re-derive the rule will
re-derive it wrongly somewhere, and the result is a link to a 404.

The same reasoning is behind `isOwner`. The profile response carries no
identifier to compare against, so the backend decides ownership and the page
renders an edit link only when that flag is true.

---

## Two privacy mechanisms, and they are not the same thing

|                           | `isAnonymous` (per resource)        | `isProfilePrivate` (per account) |
| ------------------------- | ----------------------------------- | -------------------------------- |
| Decided                   | At creation, stored on the resource | Any time                         |
| Effect                    | Withholds the **name**              | Withholds the **profile page**   |
| Affects old contributions | No                                  | No                               |

Privacy withdraws the **link**, not the name. A contributor who shared
something publicly with their name attached never asked to be unattributed, so a
private profile still reads "Shared by Ada" on the feed — there is just nowhere
for it to go. A _withheld_ name is a different state entirely: it arrives as a
null `contributor`, and `isAnonymous` is what tells the two apart so the copy can
say which happened.

`ProfilePrivacySetting`'s description says this in as many words. "Private" on a
social profile reads as "you will disappear", and the switch is useless if
somebody is afraid to touch it.

The switch is **disabled until a username is claimed** — a private profile with
no handle hides a page nobody can reach, and accepting that state reads as a
setting that has taken effect.

---

## Two paths to a 404, on purpose

`GET /users/:username` answers 404 for a private profile, not 403, because a 403
would confirm the handle exists. The frontend's `notFound()` page therefore
cannot distinguish "nobody has claimed this" from "this exists and is hidden",
and must not try to — the wording has to be true for both.

Both cases render the same page and carry Next's `noindex` meta tag.

### 404s and HTTP status

`/u/[username]` returns **HTTP 200** even for a 404. This is the trade-off
`resource-queries.ts` already documents: `loading.tsx` puts the route behind a
Suspense boundary, so the render has already started streaming by the time the
404 is known, and the status can no longer be changed. Next compensates with
`noindex`.

Getting a real 404 means checking existence in `src/proxy.ts` before the render
starts, which costs an extra backend round trip on every profile view. Not worth
it for a page that is `noindex` anyway.

---

## Tokens on server-side reads

Every server-side call to a profile route carries the Clerk token explicitly:

```ts
const { getToken } = await auth();
return getProfile(username, (await getToken()) ?? undefined);
```

The Axios interceptor that attaches the JWT is installed by `AuthTokenSetter`, a
client component, so it never runs on the server. **Without the token the backend
cannot tell an owner from a stranger, and a private profile 404s for its own
owner.**

`getCachedProfile` takes the viewer id as part of its cache key for the same
reason: the answer genuinely differs by viewer, and sharing one cached entry
would show a private profile to a stranger or 404 it for its owner.

---

## Onboarding: `/share` is gated, without ejecting you

A contribution needs somewhere to point back to. A profile with no username has
no address, so the byline would be a name with nothing to click.

`/share` **replaces the form with an explanation** rather than redirecting. A
silent bounce to `/settings/profile` reads as a broken app and loses the reason
the person was there. A greyed-out form is barely better — a lot of dead surface
you can look at but not touch, and still have to leave.

```ts
const username = await getMyUsername();
if (!username) return <UsernameNeeded />;
```

`/settings/profile?next=/share` then returns them to the form after a save.

### A failed read is not the same as no username

`getMyUsername` **throws** on failure. It used to return `null` for both, which
made "the backend is down" indistinguishable from "you have not chosen a
username" — and since the gate blocks on `null`, a transient error locked
somebody out of sharing with a message about usernames, which is both untrue and
unactionable. They could not have shared anyway with the backend unreachable, so
the error boundary costs nothing.

### `?next=` is validated, not trusted

`next` becomes a `router.push` target, which is the textbook open-redirect shape.
`safeNext` checks the string **the browser will see**, not the raw parameter:
C0 controls and spaces are stripped first, because the URL spec strips them
during parsing.

That is not paranoia. `"/\t/evil.com"` starts with a slash and passes a naive
`startsWith("/")` test, but the tab is removed during parsing, leaving
`/evil.com` — and the slashes are then read as protocol-relative, sending the
person to `https://evil.com/`. Verified against `new URL()` across tab, LF, CR,
NUL and the backslash forms.

---

## Save is enabled only when it would do something

`ProfileForm`'s button is disabled until a real change exists. Not a
`formState.isDirty` check — it uses the **same two comparisons as the submit
handler**, wrapped in one `isUsernameEdit` helper so the two cannot drift.

Deriving them separately is how a button ends up enabled for a change that is
then silently dropped. That is not hypothetical: an earlier version compared the
_normalized_ username while the submit compared the raw one, so retyping a
handle in different case looked unchanged when the backend would have re-granted
it and changed the displayed name.

`<ProfileForm>` **must be keyed on `profile.usernameLower`.** `useForm` reads
`defaultValues` only on mount and `router.refresh()` does not remount, so a
rename would leave the field showing the old value while the baseline moved
underneath it — and the button the change was for would stay enabled forever
after its one useful click. A bio-only save self-corrects, because the baseline
and the field converge.

### A username cannot be released, only changed

The backend has no path that sets `usernameLower` back to null:
`UpdateMyProfileDto` requires 3 characters, and `applyClaim` only ever grants.
So an **empty username means "unchanged"**, while an **empty bio means "clear
it"** — the same empty string meaning opposite things in adjacent fields.

That asymmetry is deliberate, and the username hint says so when a held handle's
field is emptied, rather than letting it read as "remove my username".

### Giving a handle up is permanent, so it asks first

Saving a different username **releases the old handle forever** — not to anybody
else, and not to you. It is the one irreversible action in settings, so it is
confirmed with a dialog naming both handles, matching the delete-resource dialog
in `ResourceOwnerActions`.

Two rules keep the dialog honest:

- **A bio-only save never asks.** A dialog on every save is how people learn to
  click through dialogs.
- **A case-only edit never asks.** `AdaL` retyped as `adal` is the same identity,
  and `applyClaim` skips the release when the normalized values match. So the
  warning keys on `isSurrenderingHandle` (normalized comparison), while the
  dirty state keys on `isUsernameEdit` (raw comparison). They are deliberately
  two different functions: a dialog that cries wolf on a cosmetic edit is one
  people stop reading.

The live hint also says `, and ada is given up for good` while such a change is
typed, so the consequence is visible before the button rather than only after it.

Cancelling keeps the pending patch rather than discarding it, so changing your
mind does not clear what somebody typed.

`/settings` shows a "choose a username" card only while none is claimed, so a
profile is offered where it is needed and stays out of the way afterwards.

`src/lib/username.ts` and the bounds in `resource-types.ts` are **hand-mirrored**
from the backend — the two packages are independently versioned with no shared
types package. The backend re-validates everything, so a disagreement shows up as
a 400 with a readable message rather than as bad data.

The username allowlist is checked with a shared `usernameProblem` function rather
than restated as zod patterns, because the backend folds accents and lowercases
_before_ applying its allowlist. A zod pattern would have to duplicate that
folding to avoid rejecting `Café` and `AdaL`.

`suggestUsername` derives a starting handle from whatever identifies the person:
their Clerk display name, or failing that the **local part of their email**. The
second source matters — Clerk's sign-up normally only asks for an email, so
"no display name" is the common case, and without it the field would be blank
for exactly the people the `/share` gate is stopping.

Only the local part is ever used, and only as a suggestion. The domain is dropped,
so nothing derived from an address can reach a public profile.

It deliberately does not loop suffixes: availability is a server question, and
inventing `ada2` without knowing whether `ada` is free would be guessing. It
returns `null` rather than a mangled handle for a name in a script we cannot
spell.

**The suggestion is a placeholder, never prefilled.** A prefilled value is a value
somebody can save without choosing, and since a suggestion is unverified, that
turns a typo correction into a 409 for a handle they never picked.

## A contributor with no name is never called "Anonymous"

`name` is nullable on the wire, and the frontend has a last-resort phrase in
`UNNAMED_CONTRIBUTOR` — "a Worth Knowing member", phrased in step with the
existing "a contributor who has since left".

It is unreachable in practice, because the server resolves the name and `/share`
guarantees a handle. A `string | null` type is not a runtime guarantee though,
and the phrase is deliberately **not** the word "anonymous", which in this
product means a specific, deliberate choice to withhold a name.

`/u/[username]` interpolates `profile.name ?? handle` rather than `profile.name`
directly — a template literal will happily print the string `"null"`.

---

## A profile's listing excludes anonymous contributions

`?contributor=` adds `isAnonymous: false` server-side, so a profile's listing
agrees with its `resourcesCount` and withheld posts stay off the profile — along
with the `why` somebody wrote to justify an unattributed contribution, which is
frequently the most identifying part.

The consequence, stated plainly: a contributor cannot see their own anonymous
posts on their profile. The rows are unchanged and the global feed still carries
them, so they can still be found and edited.

`ResourceFeed` carries `contributor` so "load more" keeps the filter. It is the
one client component in the read path, so a filter that was not carried would make
page two of a profile be page two of the whole feed.
