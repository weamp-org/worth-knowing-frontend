import { ImageResponse } from "next/og";

import {
  getOgFonts,
  OG_BACKGROUND,
  OG_BRAND_BLUE,
  OG_INK,
  OG_MUTED,
  OG_SANS,
  OG_SERIF,
} from "@/lib/og";
import { SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/site";

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
 * ## The chrome matches the app, not a template
 *
 * The headline is the app's own heading face (`Instrument Serif`) and the rest
 * is its body face (`Inter`), both bundled in `src/app/_og-fonts/` — see
 * `src/lib/og.ts`. The blue is sampled from the app icon. Nothing here is
 * uppercased by CSS: `WeAMP` is set in its natural case, the way the header and
 * footer set it, because an uppercase transform is what used to render it as
 * "WEAMP".
 *
 * ## The footer bar is the call to action
 *
 * An OG card cannot carry a working link, so the closest thing is the host
 * itself, set in a full-bleed brand-blue bar: a recipient reading the card
 * knows exactly where to type. It is derived from `NEXT_PUBLIC_SITE_URL` —
 * the same single source as every other absolute URL — and falls back to the
 * site name when no origin is configured.
 */

export const alt = SITE_TAGLINE;

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

export default async function Image() {
  const host = siteUrl()?.host ?? null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        background: OG_BACKGROUND,
      }}
    >
      {/* Brand rail, echoing the app's blue. */}
      <div style={{ width: 20, background: OG_BRAND_BLUE }} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 88px",
            gap: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: OG_BRAND_BLUE,
                color: "#ffffff",
                fontFamily: OG_SERIF,
                fontSize: 36,
              }}
            >
              WK
            </div>

            {/* `display: flex`: Satori requires an explicit flex (or contents /
            none) on any element with more than one child — the text and the
            accent span are two — so the two-tone line is a row, not a block. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontFamily: OG_SANS,
                fontSize: 30,
                color: OG_MUTED,
              }}
            >
              <span>A site by&nbsp;</span>
              <span
                style={{
                  color: OG_BRAND_BLUE,
                  fontFamily: OG_SERIF,
                  fontSize: 34,
                }}
              >
                WeAMP
              </span>
            </div>
          </div>

          <div
            style={{
              fontFamily: OG_SERIF,
              fontSize: 118,
              lineHeight: 1.05,
              color: OG_INK,
            }}
          >
            {SITE_NAME}
          </div>

          {/* The premise, which is the only place the product states it in words —
            and is therefore the only thing a card can honestly say about itself. */}
          <div
            style={{
              fontFamily: OG_SANS,
              fontSize: 38,
              lineHeight: 1.35,
              color: OG_MUTED,
            }}
          >
            {SITE_TAGLINE}
          </div>
        </div>

        {/* The call to action: where to go, in the brand blue. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: OG_BRAND_BLUE,
            color: "#ffffff",
            fontFamily: OG_SANS,
            fontWeight: 600,
            fontSize: 30,
            padding: "24px 88px",
          }}
        >
          {host ?? SITE_NAME}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: await getOgFonts(),
    },
  );
}
