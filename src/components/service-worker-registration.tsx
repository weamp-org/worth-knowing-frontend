"use client";

import { useEffect } from "react";

/**
 * Registers the installability-only service worker (`public/sw.js`).
 *
 * A component rather than an inline script, following the `AuthTokenSetter`
 * pattern: it mounts once in the root layout, runs one effect, and renders
 * nothing. Registration is guarded on `'serviceWorker' in navigator` so
 * browsers without support — and every prerendered pass — skip it silently.
 *
 * `scope: "/"` with the worker served from `/sw.js` gives it control of the
 * whole origin, which is what makes the manifest's `start_url` and `scope`
 * actually controlled. `updateViaCache: "none"` keeps the browser from
 * consulting the HTTP cache before checking for a worker update, alongside the
 * `no-cache` header set in `next.config.ts`.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Installation is an enhancement, not a requirement. A failed
        // registration must never surface to the reader.
      });
  }, []);

  return null;
}
