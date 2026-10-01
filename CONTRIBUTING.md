# Contributing

Thanks for your interest in contributing to Worth Knowing (frontend).

## Prerequisites

- Node 24+, pnpm 11.2.2
- A [Clerk](https://clerk.com) application

## Setup

```bash
pnpm install
cp .env.local.example .env.local
# Fill in your Clerk publishable and secret keys
pnpm dev
```

The dev server runs on port 3001.

## Commands

| Command          | Description                         |
| ---------------- | ----------------------------------- |
| `pnpm dev`       | Dev server on port 3001             |
| `pnpm build`     | Production build                    |
| `pnpm lint`      | Biome check (linter + formatter)    |
| `pnpm format`    | Biome format write                  |
| `pnpm typecheck` | `tsc --noEmit`                      |

Run `pnpm typecheck && pnpm lint` before submitting changes.

## Branching and commits

**During initial development, commit and push straight to `develop`.** No feature
branch, no PR. This is deliberate: the project has no external contributors yet
and nothing else depends on `develop`, so a branch costs a merge, a round trip
and a decision about whether to split the commits — in exchange for review
that nobody is doing.

Branch and open a PR when any of these become true:

- There are other contributors whose work must not land unreviewed
- CI is gated on a protected branch
- A change is large enough to want review before it lands

`main` is for releases and stays untouched by day-to-day work.

Commits should still be small and single-concern, and should still pass CI. The
simplification is about *where* they land, not about what goes in them — a
feature and a refactor stay separate commits even when both go straight to
`develop`.

The frontend and backend are versioned independently, so a change spanning both
is two commits and two pushes, with no expectation of atomicity.

## Guidelines

- If adding an env var, update `.env.local.example` and document it in the README

See [docs/](docs/) for detailed guides on auth, resources, theming, and deployment.
