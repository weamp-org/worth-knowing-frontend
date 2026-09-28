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
ready for one — it is already used for the feed's filter pills — but tagging is
not the point of a contribution, so it stays text until it needs to be more.

## Known gaps

Two things are deliberately not handled here. Both are backend issues; neither is
worked around silently.

**`PATCH /resources/:id` has no ownership check.** Any signed-in user can edit
any resource. `/resources/[id]/edit` redirects non-owners away, but that is
presentation, not enforcement — the endpoint itself is still open. The local
`User.id` is the Clerk user id, so the ids are directly comparable when the check
is added. It should be fixed in the backend, with tests.

**Nothing exposes the caller's role.** `DELETE /resources/:id` is admin-gated,
but there is no `GET /users/me`, so the frontend cannot know when to offer a
delete button. Adding one is a product decision as much as an API one — should
admins delete anyone's resource, or should there be a report/soft-delete path for
ordinary contributors? Worth settling before the endpoint is written.

## Types

The two packages are independently versioned with no shared types package, so
`src/lib/resource-types.ts` is hand-maintained against:

- `worth-knowing-backend/prisma/schema.prisma` — `ResourceType`, `AccessType`
- `worth-knowing-backend/src/resources/dtos/resource-response.dto.ts`
- `worth-knowing-backend/src/tags/dtos/tag-response.dto.ts`
- `worth-knowing-backend/src/resources/dtos/create-resource.dto.ts`

Enum values and validation limits are restated there so a backend change that is
not mirrored shows up as a type error rather than as a rejected request.

## Vendored components

`src/components/ui/` is Biome-ignored — do not reformat it. Components are
added with the CLI and removed by hand when they fall out of use:

```bash
pnpm dlx shadcn@latest add <component>
```

`src/components/ui/form.tsx` and `dialog.tsx` were removed as unused. The CLI
will happily reintroduce them, so re-check before committing a vendor bump.
