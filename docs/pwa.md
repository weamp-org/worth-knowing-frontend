# Installable app (PWA) and push notifications

Users can install Worth Knowing as an app on supported devices, and signed-in
readers can opt into push notifications for their inbox from settings. That is
the whole scope: installability plus push. There is no offline support, no
precaching, and no background sync.

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
  URL. A manifest alone is not enough. It also carries the `push` and
  `notificationclick` handlers (see below); nothing else.
- `src/components/service-worker-registration.tsx` — registers `/sw.js`,
  mounted in the root layout. Registration failure is swallowed: installation
  is an enhancement, never a requirement.
- `src/components/service-worker-registration.tsx` — registers `/sw.js`,
  mounted in the root layout. Registration failure is swallowed: installation
  is an enhancement, never a requirement.
- `appleWebApp: { capable: true }` in the root metadata — iOS ignores the
  manifest's `display` depending on version, so this is what puts a
  home-screen launch into the standalone window.
- `headers()` in `next.config.ts` serves `/sw.js` as `no-cache`, so worker
  updates actually reach installed apps.

## Push notifications

Opt-in per browser, flipped in settings and nowhere else — no auto-prompting,
no banner. What each piece does:

- `src/components/push-setting.tsx` — the toggle. Handles the three states
  (on, off, unavailable with the reason beside it), asks permission only when
  flipped on, and re-sends an existing subscription on mount so a server-side
  prune cannot desync the halves.
- `GET /notifications/push-public-key` — the VAPID public key, served rather
  than baked into env so there is one place the keys live.
- `POST/DELETE /notifications/push-subscriptions` — records and forgets this
  browser. The backend upserts on the endpoint and fans every notification out
  to all of the recipient's rows; see the backend's notifications doc.
- `public/sw.js` — renders the payload (`title`, `body`, `url`) and steers a
  tap at the page: focuses the open tab on it, navigates the app tab to it, or
  opens it. Never strands a second copy beside the open app.

Two platform facts shape testing, not code: iOS delivers only to the
*installed* app (16.4+), and local push testing needs HTTPS
(`next dev --experimental-https`), which the default HTTP setup does not do.
Verify by hand on a real device or a preview deployment: toggle on, comment
from a second account, confirm the notification opens the resource.

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
