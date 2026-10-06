import type { MetadataRoute } from "next";

import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/**
 * The Web App Manifest, served at `/manifest.webmanifest`.
 *
 * ## Installability-only, deliberately
 *
 * This exists so supported browsers offer Worth Knowing as an installable app.
 * It carries identity (name, icons, colors) and launch behaviour (`start_url`,
 * `scope`, `display`) and nothing else: no `shortcuts`, no `screenshots`, no
 * `share_target`. Those are separate features with their own UX questions, not
 * prerequisites for installation.
 *
 * ## `id` and `start_url` are permanent
 *
 * The installed app's identity is keyed on `id`. Changing it later orphans
 * existing installs — they read as a different app — so `"/"` is set once and
 * stays. `start_url` carries no tracking params for the same reason identity
 * must not depend on context: every install launches the same feed.
 *
 * ## One `theme_color`, and it is the light one
 *
 * The manifest allows a single value while the app themes per scheme
 * (`themeColor` in `layout.tsx`). First launch is light-mode for most users, so
 * the task-switcher backdrop matches that case. The per-scheme `<meta>` still
 * governs the browser chrome itself.
 *
 * ## Icons come from `public/`, not the metadata-file icons
 *
 * `src/app/icon.png` is 32px and `apple-icon.png` is 180px — neither satisfies
 * the 192/512 installability minimum, so they are not referenced here. The
 * `public/icon-*.png` files are Lanczos-upscaled renders of the same WK brand
 * mark at installable sizes, and the maskable one carries safe-zone padding so
 * Android's shaped masks do not crop the letterforms.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_TAGLINE,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
