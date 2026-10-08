import { ImageResponse } from "next/og";

import { descriptionFrom } from "@/lib/description";
import {
  getOgFonts,
  OG_BACKGROUND,
  OG_BRAND_BLUE,
  OG_INK,
  OG_MUTED,
  OG_SANS,
  OG_SERIF,
} from "@/lib/og";
import { getCachedResource } from "@/lib/resource-queries";
import { SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/site";

/**
 * The social card for one resource: **the contributor's reason, not the wordmark.**
 *
 * ## Why the `why` is the headline
 *
 * This is the product's only transferable artifact. The resource's own title and
 * link already exist everywhere else — the recipient can see the site name in the
 * URL — and the *reason* is the one thing that exists only here and on the resource
 * page. So a card reading "Worth Knowing" plus a logo would spend the single
 * impression that could have carried a person's reasoning on advertising a name
 * the reader already has.
 *
 * The title sits small and above as context; the reason is large, because that is
 * the reading order and the reason is what makes somebody tap.
 *
 * ## Nothing private is rendered, and there is no branch that could
 *
 * **No contributor is named, ever.** Whether a name is attached is a decision the
 * contributor makes per resource, and `getCachedResource` is the *public* read, so
 * an anonymous contribution arrives already stripped of its contributor. There is
 * deliberately no code path that could print a name — not a conditional one, not a
 * fallback one. That is a stronger guarantee than checking a flag, and it is why
 * the three byline states this app distinguishes so carefully cannot be collapsed
 * by an image renderer.
 *
 * The card uses the title and the `why`, both of which are public by definition.
 *
 * ## Fallback
 *
 * A shared link whose resource has since been deleted still has to render *a*
 * card: a 500 on an OG image is worse than a plain one. So the catch falls back to
 * the site identity rather than throwing.
 *
 * ## The chrome matches the app, not a template
 *
 * The `why` is set in the app's own heading face (`Instrument Serif`), the rest
 * in its body face (`Inter`), both bundled in `src/app/_og-fonts/` — see
 * `src/lib/og.ts`. The blue rail, mark and footer bar use the brand blue sampled
 * from the app icon. Nothing here is uppercased by CSS: earlier styling put the
 * wordmark through `text-transform: uppercase`, which is what rendered it as
 * "WORTH KNOWING" instead of the header's natural case.
 *
 * ## The footer bar is the call to action
 *
 * An OG card cannot carry a working link, so the footer names the host the
 * reasoning lives at. The host is derived from `NEXT_PUBLIC_SITE_URL` — the same
 * single source as every other absolute URL — and falls back to the site name
 * when no origin is configured.
 */

export const alt = "Why somebody thought this resource was worth knowing";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

/**
 * Characters of `why` the card carries. Larger than the search-snippet budget
 * because the card has the height for it; still bounded, because a 5,000
 * character `why` at headline size would overflow the 630px frame — the
 * container's `overflow: hidden` is only the backstop, not the plan.
 */
const CARD_WHY_BUDGET = 200;

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let title = SITE_NAME;
  let why = SITE_TAGLINE;

  try {
    const resource = await getCachedResource(id);

    title = resource.title;
    // The same helper the page metadata uses, so the card and the search snippet
    // cannot disagree about what this contribution is about — with a larger
    // budget, because the card has room the snippet does not.
    why = descriptionFrom(resource.why, CARD_WHY_BUDGET) ?? "";
  } catch {
    // Left as the site identity rather than thrown: a card for a deleted resource
    // should still render.
  }

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
            padding: "40px 72px",
            gap: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: OG_BRAND_BLUE,
                color: "#ffffff",
                fontFamily: OG_SERIF,
                fontSize: 28,
              }}
            >
              WK
            </div>

            <div
              style={{
                fontFamily: OG_SANS,
                fontWeight: 600,
                fontSize: 28,
                color: OG_MUTED,
              }}
            >
              Worth Knowing
            </div>
          </div>

          {/* The resource title, small — context the recipient already has. */}
          <div
            style={{
              fontFamily: OG_SANS,
              fontWeight: 600,
              fontSize: 30,
              lineHeight: 1.3,
              color: OG_MUTED,
              maxHeight: 78,
              overflow: "hidden",
            }}
          >
            {title}
          </div>

          {/* The reason, large — the thing being shared, and the only part of this
            card a recipient has not already seen. */}
          <div
            style={{
              display: "flex",
              fontFamily: OG_SERIF,
              fontSize: 48,
              lineHeight: 1.25,
              color: OG_INK,
              maxHeight: 240,
              overflow: "hidden",
            }}
          >
            {why}
          </div>
        </div>

        {/* The call to action: where the reasoning lives, in the brand blue. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: OG_BRAND_BLUE,
            color: "#ffffff",
            fontFamily: OG_SANS,
            fontWeight: 600,
            fontSize: 28,
            padding: "22px 72px",
          }}
        >
          {host ? `See why at ${host}` : SITE_NAME}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: await getOgFonts(),
    },
  );
}
