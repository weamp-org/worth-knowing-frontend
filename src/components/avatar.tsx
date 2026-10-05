import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * A person's picture, or their initials where there isn't one.
 *
 * **The fallback is the point.** Clerk accounts routinely have no uploaded image,
 * and the two places that rendered `imageUrl` before this existed both rendered
 * *nothing* in that case — `/u/[username]` left a gap where the 64px avatar
 * should be. An avatar that is sometimes absent is worse than one that is never
 * absent, because the layout has to be designed around a hole nobody can predict.
 * So the circle is always there, and only its contents vary.
 *
 * **Initials, not a generic glyph.** A person icon says "a person is here" and
 * `A` says *which* one, which is the entire reason an avatar earns its space next
 * to a byline. `initialsOf` is deterministic on the server and in the browser,
 * which this needs for the reason the feed needs it — see `format.ts`.
 *
 * **A plain `<img>`, never `next/image` — because of size, not host.** Clerk
 * proxies every uploaded picture through one host, `img.clerk.com`, so a single
 * `remotePatterns` entry would in fact admit them all. An earlier version of this
 * comment claimed the opposite — that arbitrary upload hosts made `remotePatterns`
 * impossible — which was wrong, and wrong in a way that would have been hard to
 * notice: it reads as a *technical* constraint and is not one at all.
 *
 * The real argument is that these are 24–64px circles already served by a CDN
 * that picks a sensible size for the device. `next/image` would route each one
 * through `/_next/image` on this server, which fetches from Clerk and re-encodes:
 * an extra network hop and some CPU to produce a file of about the same size. The
 * optimiser earns nothing at this scale — it is built for hero images and
 * full-width photographs.
 *
 * **Where this would stop being true** is if avatars grew. A 128px header, or a
 * contributor grid, is where resizing starts to pay for the hop. Revisit it if
 * one of those appears; do not reach for it now. See `docs/profiles.md` for why
 * the avatar is Clerk's to serve at all.
 *
 * **Decorative.** Always `alt=""`, because the display name is always adjacent —
 * in a byline, a profile header, or an account row. Announcing "picture of Ada
 * Lovelace" immediately before "Ada Lovelace" is the same information twice, and
 * a screen reader user pays for it on every card in the feed. The initials
 * fallback is `aria-hidden` for the same reason.
 */
export function Avatar({
  imageUrl,
  name,
  size = "md",
  className,
}: {
  /** The Clerk-hosted image, which may be absent for an account with none. */
  imageUrl: string | null;
  /**
   * What to fall back to. A `null` name is reachable — it is exactly the case
   * this component exists for — and then the circle renders empty rather than
   * guessing at a letter.
   */
  name: string | null;
  size?: AvatarSize;
  className?: string;
}) {
  const initials = initialsOf(name);

  return (
    <span
      className={cn(
        // The ring is load-bearing, not decoration. `bg-muted` is `oklch(0.97
        // 0 0)` in light mode — 97% white, on a page whose `--card` is pure
        // white. A disc that close to its own background has no edge, so the
        // initials fallback read as *faint* rather than *small*, and raising the
        // size alone does not fix it. `border-border` is the same hairline the
        // rest of the app uses to separate things (`HomeSection`, the `dense`
        // card), so it is the established way to give a surface an edge here.
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted",
        SIZES[size],
        className,
      )}
    >
      {/* Initials first and the image second, **both absolutely positioned**, so
          the image paints on top of the letters rather than under them.

          Both being positioned is the load-bearing part. A positioned element
          paints above a static one regardless of DOM order, so an `absolute`
          initials span over a static `<img>` draws the letters *over* the
          photograph — which is exactly what happened on the first pass, and is
          why this reads as two layers of the same avatar rather than a fallback.
          Positioned siblings at the same z-index paint in DOM order, so initials
          then image gives the image the top without a `z-index` to argue about.

          Initials sit underneath rather than replacing the image so a slow
          avatar shows letters and then sharpens, instead of reserving nothing
          and reflowing when the bytes land. */}
      {initials ? (
        <span
          aria-hidden="true"
          className={cn(
            // `text-foreground` rather than `text-muted-foreground`. On a
            // `bg-muted` disc the muted foreground is mid-grey on near-white,
            // which is legible but has no presence — the initials are the whole
            // content of the avatar, so they carry the full weight of it. Kept
            // off pure foreground so an initials disc still reads as a quiet
            // placeholder next to a photograph rather than competing with one.
            "absolute font-medium text-foreground select-none",
            INITIAL_SIZES[size],
          )}
        >
          {initials}
        </span>
      ) : null}

      {imageUrl ? (
        // biome-ignore lint/performance/noImgElement: a 24-64px circle from a CDN that already serves it at a sensible size — see above
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 size-full rounded-full object-cover"
        />
      ) : null}
    </span>
  );
}

/**
 * Sized against the text each one sits beside, not in absolute terms — an avatar
 * that reads at the same weight as the label next to it stops being an avatar.
 *
 * `sm` sits in the card footer against `text-xs` (12px), so 28px reads as a face
 * beside a caption. `md` is the resource page's `text-sm` footer; `lg` is the
 * profile header, which was right at 64px from the start.
 *
 * **20px, then 24px, were both reported as too small, and the size was not the
 * whole problem.** What was actually being seen was the initials fallback, where
 * a `bg-muted` disc on a near-white page has no edge and `text-muted-foreground`
 * letters have no presence — so it read as *faint*, which is indistinguishable
 * from small at a glance. The border and the foreground fix that; this bump is
 * the part that is genuinely about size.
 *
 * Worth remembering when this is judged again: **the two paths look different.**
 * A photograph at `sm` is 28px of high-contrast colour and reads fine. An
 * initials disc is low-contrast by construction, so it will always be the one
 * that feels too small. Judge a size change against both.
 */
const SIZES = {
  /** A card footer byline, next to `text-xs`. */
  sm: "size-7",
  /** A resource page footer, next to `text-sm`. */
  md: "size-9",
  /** A profile header. */
  lg: "size-16",
} as const;

/**
 * Large enough to fill the circle without crowding it, and tracked slightly wide
 * because two capitals in a round shape want the air. Kept in step with `SIZES` —
 * a `size-6` circle holding `md` initials is a dark blob.
 */
const INITIAL_SIZES = {
  sm: "text-[0.6875rem] tracking-wide",
  md: "text-sm tracking-wide",
  lg: "text-xl tracking-wide",
} as const;

type AvatarSize = keyof typeof SIZES;
