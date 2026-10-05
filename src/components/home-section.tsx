import type { ReactNode } from "react";

/**
 * One labelled band of the home page.
 *
 * Rendered on the server, so it costs nothing and holds no state. The only
 * reason it exists rather than being three repeated blocks of markup is that
 * **`children` is optional** — which is the whole design.
 *
 * Every section on this page can legitimately have nothing to show: the most-saved
 * rail is empty until somebody saves something, and the surprise card is empty on
 * a site with no resources at all. A required `children` would force each caller
 * to branch and hand-roll a heading over nothing, and the two laziest versions of
 * that are an empty band with a heading and a heading followed by "coming soon".
 * Both advertise an emptiness the page does not need to advertise — on a young
 * site that is most of the time.
 *
 * So a section with nothing to say renders nothing at all. `aria-labelledby` on
 * the `<section>` and `id` on the `<h2>` means the labelled relationship survives
 * for the ones that do render, which is what a screen reader announces on
 * entering the band.
 */
export function HomeSection({
  id,
  title,
  description,
  children,
}: {
  /** Becomes the `<section>`'s id and the heading's `aria-labelledby` target. */
  id: string;
  title: string;
  /** One line under the heading. Omit rather than pad with an empty string. */
  description?: string;
  /** Absent when the section has nothing to show, and then nothing renders. */
  children?: ReactNode;
}) {
  if (!children) return null;

  const headingId = `${id}-heading`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="mt-12 border-t border-border pt-8"
    >
      <h2
        id={headingId}
        className="font-heading text-2xl font-semibold tracking-wide"
      >
        {title}
      </h2>

      {description ? (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      ) : null}

      <div className="mt-5">{children}</div>
    </section>
  );
}
