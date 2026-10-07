import { ImageResponse } from "next/og";

import { descriptionFrom } from "@/lib/description";
import { getCachedResource } from "@/lib/resource-queries";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

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
 * ## Fonts
 *
 * `next/og` resolves fonts by name and cannot read the app's CSS, so the default
 * sans stands in for the site's `Instrument_Serif` heading face. Fetching a font
 * per request would add latency to every card render for a decorative gain — an
 * image's typography is not selectable, copyable, or read by a crawler.
 */

export const alt = "Why somebody thought this resource was worth knowing";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

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
    // cannot disagree about what this contribution is about.
    why = descriptionFrom(resource.why, 300) ?? "";
  } catch {
    // Left as the site identity rather than thrown: a card for a deleted resource
    // should still render.
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#fafafa",
        color: "#0a0a0a",
        padding: 72,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            fontSize: 26,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#737373",
          }}
        >
          Worth Knowing
        </div>

        <div style={{ fontSize: 40, lineHeight: 1.2 }}>{title}</div>
      </div>

      {/* The reason, large — the thing being shared, and the only part of this
            card a recipient has not already seen. */}
      <div
        style={{
          display: "flex",
          fontSize: 46,
          lineHeight: 1.3,
          color: "#171717",
        }}
      >
        {why}
      </div>
    </div>,
    size,
  );
}
