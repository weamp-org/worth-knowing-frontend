# Worth Knowing Frontend

Next.js 16 frontend for Worth Knowing, with [Clerk](https://clerk.com) authentication, [Tailwind CSS v4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), and dark mode.

## Features

- **Authentication** — Clerk (sign-in, sign-up, user button) with middleware
- **Resources** — Server-rendered feed with keyset pagination, tag filter, detail pages, and share/edit forms
- **Anonymity** — Share anonymously as a default or per resource; names withheld from public responses
- **Collections** — Group resources into private-by-default lists; save from any resource, public ones listed on your profile
- **Forms** — React Hook Form + Zod via the shadcn `Controller` + `Field` pattern
- **Dark mode** — Light/dark/system toggle via `next-themes`
- **UI components** — shadcn/ui (radix-sera style) with Tailwind v4
- **Code quality** — Biome (linter + formatter), Husky + lint-staged
- **TypeScript** — Strict mode, `@/*` path alias
- **React Compiler** — Enabled in `next.config.ts`
- **Data fetching** — Server Components for reads, Axios with a Clerk JWT interceptor for writes (TanStack Query is installed but unused)
- **Layout** — Semantic header/main/footer, loading, error, and 404 pages

## Prerequisites

- [Node.js](https://nodejs.org) 24+
- [pnpm](https://pnpm.io) 11.2.2
- A [Clerk](https://clerk.com) application (free tier)
- The [backend](../worth-knowing-backend) running on port 3000

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
#    Copy .env.local.example to .env.local and fill in your Clerk values:
#    - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (from Clerk Dashboard > API Keys)
#    - CLERK_SECRET_KEY                (from Clerk Dashboard > API Keys)

# 3. Start the dev server
pnpm dev
```

Visit `http://localhost:3001`. Sign up via the nav to test authentication.

### Running the backend

The resource pages read from the NestJS backend, so it needs to be up too. It
lives in a **separate repository** with its own dependencies and lockfile — there
is no root task runner, and this package has no way to start it.

```bash
cd ../worth-knowing-backend
cp .env.local.example .env.local   # then fill in DATABASE_URL and the Clerk keys
docker compose up -d               # local Postgres
pnpm start:dev                      # http://localhost:3000/api/v1
```

The backend allows CORS from `FRONTEND_BASE_URL`, which defaults to
`http://localhost:3001`. With both running, the feed at `/` shows whatever the
database holds. Swagger UI is at `http://localhost:3000/api/v1/documentation`
outside production.

## Project structure

```text
src/
├── app/
│   ├── globals.css          # Tailwind v4 + shadcn theme tokens
│   ├── layout.tsx           # Root layout (Clerk, ThemeProvider, header/footer)
│   ├── (feed)/
│   │   ├── page.tsx         # Resource feed (tag filter + pagination)
│   │   └── loading.tsx      # Feed-only loading boundary
│   ├── error.tsx            # Error boundary
│   ├── not-found.tsx        # 404 page
│   ├── contributors/        # Static "who works on this" page
│   ├── share/
│   │   ├── page.tsx         # Share a resource (auth required)
│   │   └── loading.tsx
│   ├── settings/
│   │   ├── page.tsx         # Your preferences (auth required)
│   │   ├── loading.tsx
│   │   └── profile/
│   │       ├── page.tsx     # Claim a username, bio, profile privacy
│   │       └── loading.tsx
│   ├── collections/
│   │   ├── page.tsx         # Your collections (auth required)
│   │   ├── new/page.tsx     # Create a collection
│   │   └── [id]/
│   │       ├── page.tsx     # Collection detail + contents (public or yours)
│   │       └── edit/page.tsx# Edit your own collection
│   ├── u/[username]/        # Public profile, contributions, public collections
│   └── resources/[id]/
│       ├── page.tsx         # Resource detail
│       └── edit/page.tsx    # Edit your own resource
├── components/
│   ├── ui/                  # shadcn/ui (Biome-ignored, vendored)
│   ├── resource-card.tsx    # One resource in the feed (isomorphic)
│   ├── resource-feed.tsx    # Feed + "Load more" (client)
│   ├── resource-owner-actions.tsx # Edit/Remove on your own resource (client)
│   ├── share-resource-form.tsx  # Share/edit form (client)
│   ├── tag-input.tsx        # Tag typeahead + chips (client)
│   ├── anonymity-toggle.tsx # Per-resource anonymity switch (client)
│   ├── anonymity-setting.tsx# Standing preference switch (client)
│   ├── collection-card.tsx  # One collection in a list (isomorphic)
│   ├── collection-form.tsx  # Create/edit form (client)
│   ├── collection-resource-feed.tsx # A collection's contents + "Load more" (client)
│   ├── collection-picker.tsx# Add/remove a resource from your collections (client)
│   ├── collection-owner-actions.tsx # Edit/Delete on your own collection (client)
│   ├── query-provider.tsx   # TanStack Query provider (staleTime: 30s)
│   ├── profile-form.tsx     # Username/bio/privacy form (client)
│   ├── theme-provider.tsx   # next-themes provider wrapper
│   ├── theme-toggle.tsx     # Light/dark toggle button
│   └── page-loading.tsx     # Shared spinner for the scoped loading.tsx files
├── lib/
│   ├── api.ts               # Axios instance + auth interceptor
│   ├── auth-token-setter.tsx # Clerk JWT → Axios interceptor
│   ├── api-error.ts         # Backend error → human-readable message
│   ├── format.ts            # Deterministic date/host formatting
│   ├── resource-types.ts    # Types mirroring the backend's resource/profile DTOs
│   ├── resource-form-schema.ts # Zod schema mirroring CreateResourceDto
│   ├── collection-types.ts  # Types mirroring the backend's collection DTOs
│   ├── collection-form-schema.ts # Zod schema mirroring CreateCollectionDto
│   ├── collection-queries.ts # Server-only collection reads (notFound, cache)
│   ├── collections-api.ts   # Typed calls to the collection endpoints
│   ├── tag-slug.ts            # Client mirror of the backend's tag folding
│   ├── username.ts            # Client mirror of the backend's username rules
│   ├── contributor.tsx        # How a contributor is described, and their byline
│   ├── settings-api.ts        # Your own preferences
│   ├── profile-api.ts         # Profiles
│   ├── profile-form-schema.ts # Zod schema mirroring UpdateMyProfileDto
│   ├── profile-queries.ts     # Server-only profile reads
│   ├── settings-queries.ts    # Server-only settings read
│   ├── resources-api.ts     # Typed calls to the resource endpoints
│   ├── resource-queries.ts  # Server-only reads (notFound, per-request cache)
│   └── utils.ts             # cn() re-export (from the `cn` package)
└── proxy.ts                 # Clerk middleware (Next.js 16 name)
```

### Data fetching

There is no test framework in this package, and `pnpm build` is the only real
verification.

Data fetching does **not** use TanStack Query. `QueryProvider` is mounted in the
root layout and the dependency is installed, but no file imports `useQuery` or
`useMutation` — every read is a Server Component `fetch` and every write is
`useState` + `try`/`catch` + `toast`. The three layers that actually exist are:

| Layer | Location | Runs in |
| --- | --- | --- |
| HTTP | `lib/*-api.ts` — thin typed calls on the shared `api` instance | RSC and client |
| Server read | `lib/*-queries.ts` — `cache()`, `notFound()`, explicit Clerk token | RSC only |
| UI | `components/*.tsx` — `useState` + imperative `await` + `toast` | client only |

This split works because the backend's `@Public()` routes need no session, so a
Server Component can read them with no token and the browser-only auth
interceptor is not required. Routes that do need one attach the token
explicitly — see `docs/collections.md` for the case where a *private* collection
has to be readable by its own owner.

Do not add `useQuery` for a new feature. If TanStack Query ever takes over, it
is a migration of every read and write at once, not a per-component choice.

## Configuration

| Variable                            | Description                                                 |
| ----------------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (public, starts with `pk_`)           |
| `CLERK_SECRET_KEY`                  | Clerk secret key (private, starts with `sk_`)               |
| `NEXT_PUBLIC_BACKEND_BASE_URL`      | NestJS backend URL (default: `http://localhost:3000/api/v1`) |

## Scripts

| Command          | Description                      |
| ---------------- | -------------------------------- |
| `pnpm dev`       | Start dev server on port 3001    |
| `pnpm build`     | Production build                 |
| `pnpm start`     | Start production server          |
| `pnpm lint`      | Biome check (linter + formatter) |
| `pnpm format`    | Biome format (`--write`)         |
| `pnpm typecheck` | TypeScript check (`--noEmit`)    |

## Docs

- [Authentication](docs/auth.md) — Clerk setup, middleware, auth patterns
- [Resources](docs/resources.md) — Routes, server/client split, forms, known backend gaps
- [Collections](docs/collections.md) — Routes, visibility, the picker, and the 404 rule
- [Theming](docs/theming.md) — Dark mode, CSS variables, custom tokens
- [Dates](docs/dates.md) — Why we use `Intl` and not a date library
- [Deployment](docs/deployment.md) — Build, environment variables, deploy targets

## License

MIT
