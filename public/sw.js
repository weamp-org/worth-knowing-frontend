/**
 * Service worker: installation plus push delivery, and nothing else.
 *
 * ## Why the `fetch` handler does nothing
 *
 * Chromium only offers installation when a service worker with a `fetch`
 * handler controls the start URL — a manifest alone is not enough. This handler
 * deliberately passes every request straight through to the network with no
 * caching, so installation works and runtime behaviour is byte-identical to
 * having no worker at all.
 *
 * ## What is deliberately not here
 *
 * No precaching, no runtime strategies, no offline fallback. Caching an app
 * whose content pages are authenticated and `force-dynamic` risks serving stale
 * or wrong-viewer responses from cache, and that is a separate feature with its
 * own design — not something to smuggle in beside an install prompt. When
 * offline support is designed, it lands in this file without changing the
 * registration or the manifest.
 *
 * ## Push
 *
 * The `push` handler renders what the backend sent (`title`, `body`, `url` —
 * composed in `PushService`, resolved against this origin). The `url` is a
 * path, so the same payload is correct on production and on a preview
 * deployment. Tapping focuses the open tab on that page when there is one and
 * opens it when there is not — a notification that strands a second copy of
 * the app beside the open one is a bug, not a delivery.
 *
 * Served with `Cache-Control: no-cache` (see `headers()` in `next.config.ts`)
 * so updates to this file reach installed apps instead of being served stale
 * from the HTTP cache.
 *
 * ## Updates activate immediately
 *
 * `skipWaiting` plus `clients.claim()` take each new worker live the moment it
 * is found. Without them an update sits in "waiting" while any tab is open and
 * the previous worker stays in control — which for a `push` handler means
 * deliveries land on a worker with no `push` listener and are silently
 * dropped. A same-day worker update that never takes over is worse than no
 * update mechanism at all, because everything up to the browser looks healthy.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icon-192x192.png",
      badge: data.badge || "/icon-192x192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window" });
      const target = new URL(url, self.location.origin).href;

      for (const client of windows) {
        // Same page open: focus it. App open elsewhere: steer that tab to the
        // notification instead of stranding a second copy beside it.
        if (client.url === target) return client.focus();
        if (new URL(client.url).origin === self.location.origin) {
          await client.navigate(target);
          return client.focus();
        }
      }

      return self.clients.openWindow(target);
    })(),
  );
});
