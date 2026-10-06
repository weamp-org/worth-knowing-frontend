# Installable app (PWA, V1 scope)

Users can install Worth Knowing as an app on supported devices. That is the
whole of the current scope: **installability only**. There is no offline
support, no precaching, no push notifications, and no background sync.

## What makes it installable

- `src/app/manifest.ts` — the Web App Manifest at `/manifest.webmanifest`.
  `id` and `start_url` are both `"/"` and permanent: changing them orphans
  existing installs.
- `public/icon-192x192.png`, `public/icon-512x512.png`,
  `public/maskable-icon-512x512.png` — install-size renders of the WK brand
  mark. Do not point the manifest at `src/app/icon.png` (32px) or
  `apple-icon.png` (180px); neither meets the 192/512 minimum.
- `public/sw.js` — a service worker whose `fetch` handler passes everything
  through to the network with **no caching**. It exists because Chromium only
  offers installation when a worker with a `fetch` handler controls the start
  URL. A manifest alone is not enough.
- `src/components/service-worker-registration.tsx` — registers `/sw.js`,
  mounted in the root layout. Registration failure is swallowed: installation
  is an enhancement, never a requirement.
- `appleWebApp: { capable: true }` in the root metadata — iOS ignores the
  manifest's `display` depending on version, so this is what puts a
  home-screen launch into the standalone window.
- `headers()` in `next.config.ts` serves `/sw.js` as `no-cache`, so worker
  updates actually reach installed apps.

## When adding offline support later

It lands in `public/sw.js` without changing the registration or the manifest.
The constraint to design around: content pages are authenticated and
`force-dynamic`, so any caching strategy must never serve a cached page to the
wrong viewer. Until that design exists, the worker stays passthrough.

## Verifying by hand

Installability cannot be verified by `typecheck` or `build` — both pass on a
manifest no browser would accept. After deploying, check:

1. Desktop Chrome DevTools → Application → Manifest: no errors, icons render.
2. One Android device: browser offers install; installed app launches
   standalone with the WK icon.
3. One iOS device: Add to Home Screen; launches standalone, not a Safari tab.
