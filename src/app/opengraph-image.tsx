import { ImageResponse } from "next/og";

import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/**
 * The site-wide default card.
 *
 * Used by any route that does not have its own: the homepage, `/browse`, the tag
 * pages, `/contributors`. Each of the routes with something more to say carries a
 * more specific `opengraph-image` file, and the more specific one wins — that is
 * how Next resolves them.
 *
 * ## Wordmark and tagline, which is right *here* and wrong on a resource
 *
 * On the homepage this is the whole honest content of the page: there is no one
 * resource being pointed at, so the site's own identity is what a card should
 * carry. On a resource page it would be a waste — the recipient can read the site
 * name in the URL, and the one impression that could have carried a person's
 * reasoning would be spent on advertising. Which is why
 * `resources/[id]/opengraph-image.tsx` exists and shows the contributor's `why`.
 *
 * ## No contributor is ever named here
 *
 * There is no prop that could name one, and that is the intent: a contributor
 * chooses per resource whether their name is attached, so no generic card may
 * imply one.
 *
 * ## Fonts
 *
 * `next/og` resolves fonts by name and cannot read the app's CSS, so the default
 * sans is used rather than the site's `Instrument_Serif` heading face. Fetching a
 * font per request would add latency to every card render for a decorative gain on
 * an image, where nothing is selectable, copyable, or read by a crawler.
 */

export const alt = SITE_TAGLINE;

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 32,
        background: "#fafafa",
        color: "#0a0a0a",
        padding: 96,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 26,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "#737373",
        }}
      >
        A site by WeAMP
      </div>

      <div style={{ fontSize: 96, lineHeight: 1.05 }}>{SITE_NAME}</div>

      {/* The premise, which is the only place the product states it in words —
            and is therefore the only thing a card can honestly say about itself. */}
      <div style={{ fontSize: 40, lineHeight: 1.3, color: "#525252" }}>
        {SITE_TAGLINE}
      </div>
    </div>,
    size,
  );
}
