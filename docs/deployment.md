# Deployment

## Build

```bash
pnpm build
```

Output goes to `.next/`. You can test it locally with:

```bash
pnpm start
```

## Environment variables

These must be set in your deployment environment:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_***
CLERK_SECRET_KEY=sk_***
NEXT_PUBLIC_BACKEND_BASE_URL=https://your-api.com/api/v1
NEXT_PUBLIC_SITE_URL=https://worthknowing.weamp.org
```

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_BACKEND_BASE_URL` and
`NEXT_PUBLIC_SITE_URL` are public and must be available to the browser.
`CLERK_SECRET_KEY` is server-only.

### `NEXT_PUBLIC_SITE_URL` is not optional

This is the site's canonical origin, and `src/lib/site.ts` has **no fallback for
it**. `metadataBase`, the sitemap, every canonical URL and every Open Graph URL are
built from it.

A defaulted value here would be a silent way to ship localhost canonicals: the
build would pass, and every canonical and OG URL would point at
`http://localhost:3001` in production — failing invisibly and only after deploy. A
missing variable instead produces a build error, which is the outcome we want.

It must be the **same origin** as:

| Where | What |
| --- | --- |
| Clerk | Application URLs → Redirect URLs, Post-sign-in, Post-sign-up |
| Backend | `FRONTEND_BASE_URL` — the CORS allowlist |
| Deployment | the host the site actually serves |

If these disagree, CORS fails in the browser, sign-in bounces to the wrong place, and
the canonical URLs point somewhere the user never sees. See `docs/seo.md`.

## Canonical host

`worthknowing.weamp.org` is the canonical origin. **No `www` variant and no
`/worth-knowing` path prefix are configured.**

If the deployment ends up serving the site on a second host — an apex/`www` pair,
a Vercel preview domain, or a `weamp.org` sub-path — that host must 308 to
`worthknowing.weamp.org`, or the same content will be reachable under two identities
and every canonical URL will be contradicted by the address bar. No such redirect
is configured today, because there is no second host to redirect from; add one in
`next.config.ts` if that changes.

## Deploy targets

### Vercel (recommended)

1. Push to a Git repository
2. Import on [Vercel](https://vercel.com/new)
3. Set the three environment variables in the project settings
4. Deploy — zero configuration needed for Next.js

### Other platforms

Most platforms (Netlify, Railway, Docker) can deploy Next.js. Make sure:

- The build command is `pnpm build`
- The output directory is `.next` (default)
- The start command is `pnpm start`
- All env vars (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_BACKEND_BASE_URL`) are set

## Clerk configuration

In your Clerk Dashboard > **Sessions**, add your production URL to:

- **Application URLs** → **Redirect URLs** (e.g. `https://worthknowing.weamp.org`)
- **Application URLs** → **Post-sign-up URL**
- **Application URLs** → **Post-sign-in URL**

## Checklist

1. Run `pnpm typecheck` and `pnpm lint`
2. Run `pnpm build` — confirm it succeeds
3. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
   `NEXT_PUBLIC_BACKEND_BASE_URL` and `NEXT_PUBLIC_SITE_URL` in the deployment
4. Set `FRONTEND_BASE_URL` on the **backend** to the same origin as
   `NEXT_PUBLIC_SITE_URL` — it is the CORS allowlist and defaults to
   `http://localhost:3001`
5. Update Clerk Dashboard with your production URLs
6. Deploy and test sign-up/sign-in flow
7. Confirm no `localhost` value survived into the deployment. After the deploy:

   ```bash
   curl -s https://worthknowing.weamp.org/robots.txt        # Sitemap: must be the production origin
   curl -s https://worthknowing.weamp.org/sitemap.xml | head # <loc>: must be the production origin
   curl -s https://worthknowing.weamp.org/ | grep canonical  # must be the production origin, not localhost
   ```
