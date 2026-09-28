/**
 * Display formatting.
 *
 * Everything here has to produce the same string on the server and in the
 * browser. The feed renders its cards inside a client component, so any value
 * formatted during render is formatted twice — once by Node, once by the
 * browser — and a mismatch there is a hydration error.
 */

/**
 * Pinned to a locale and forced to UTC.
 *
 * `toLocaleDateString()` with no arguments resolves against the machine's time
 * zone, and the ICU data bundled with Node is not always the same build the
 * browser ships. Both would make "12 Mar 2026" render as "3/12/2026" or
 * "11 Mar 2026" depending on where it runs.
 */
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** An absolute date, or an empty string if the input is not a date. */
export function formatDate(iso: string): string {
  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? "" : DATE_FORMAT.format(date);
}

/**
 * The hostname to show next to a resource, without a leading `www.`.
 *
 * Falls back to the raw string rather than throwing: a URL the backend accepted
 * should never take a page down, and `new URL` is stricter than some inputs it
 * lets through.
 */
export function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
