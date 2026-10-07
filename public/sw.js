/**
 * Installability-only service worker.
 *
 * ## Why this file exists with a handler that does nothing
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
 * Served with `Cache-Control: no-cache` (see `headers()` in `next.config.ts`)
 * so updates to this file reach installed apps instead of being served stale
 * from the HTTP cache.
 */
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
