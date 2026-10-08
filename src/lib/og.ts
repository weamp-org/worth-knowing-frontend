import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Shared Open Graph rendering pieces: the brand color and the app's own typefaces.
 *
 * ## Why local files rather than a per-request fetch
 *
 * `next/og` (Satori) cannot read the app's CSS, so the `Instrument_Serif` /
 * `Inter` faces loaded in `layout.tsx` are invisible to it and it would fall
 * back to its default sans. Fetching a font from Google Fonts on every card
 * render would add that latency to each request; these `latin` subsets live in
 * `src/app/_og-fonts/` (~180KB total, under the 500KB `ImageResponse` bundle
 * budget) and are read once and cached for the process lifetime.
 *
 * Only `ttf`/`otf`/`woff` are supported by `ImageResponse` — `woff2` is not —
 * so these are `ttf`.
 */

/** The brand blue, sampled from the app icon (`public/icon-192x192.png`). */
export const OG_BRAND_BLUE = "#1447e6";

/** Page background on the cards, matching the light-mode app background. */
export const OG_BACKGROUND = "#ffffff";

/** Primary text on the cards. */
export const OG_INK = "#0a0a0a";

/** Secondary text on the cards. */
export const OG_MUTED = "#525252";

const INSTRUMENT_SERIF = "Instrument Serif";
const INTER = "Inter";

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600;
  style: "normal";
};

async function readOgFont(file: string): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(
    await readFile(join(process.cwd(), "src/app/_og-fonts", file)),
  );

  return bytes.buffer as ArrayBuffer;
}

let cached: Promise<OgFont[]> | null = null;

/**
 * The app's own faces for `ImageResponse`, read once and then reused.
 *
 * `name` must match the `fontFamily` used in the card styles exactly — that
 * string is the only link between the two.
 */
export function getOgFonts(): Promise<OgFont[]> {
  cached ??= Promise.all([
    readOgFont("instrument-serif-400.ttf").then((data) => ({
      name: INSTRUMENT_SERIF,
      data,
      weight: 400 as const,
      style: "normal" as const,
    })),
    readOgFont("inter-400.ttf").then((data) => ({
      name: INTER,
      data,
      weight: 400 as const,
      style: "normal" as const,
    })),
    readOgFont("inter-600.ttf").then((data) => ({
      name: INTER,
      data,
      weight: 600 as const,
      style: "normal" as const,
    })),
  ]);

  return cached;
}

export const OG_SERIF = INSTRUMENT_SERIF;
export const OG_SANS = INTER;
