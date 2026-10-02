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
 * A date with its time, for surfaces where *when* within a day is the point.
 *
 * Moderation queues are the case that needs this: "reported 2 Oct 2026" cannot
 * separate a report that arrived an hour ago from one that has sat for a week,
 * nor say which of two same-day reports came first.
 *
 * Deliberately absolute rather than relative. A relative string is a function of
 * `now`, so the server render and the client hydration compute it microseconds
 * apart and disagree — a hydration error on every row, worsening as the minute
 * rolls over. See the Hydration note above.
 *
 * Pinned to UTC for the same reason as `formatDate`: a per-user zone is the
 * unresolved question in `docs/dates.md`, not something to reopen mid-render.
 *
 * The time is built by hand rather than by a second `Intl.DateTimeFormat`.
 * 12-hour formatting puts ICU's meridiem at the mercy of the platform, and the
 * platforms do not agree: `en-GB` lowercases it to `pm`, and the character
 * before it is U+0020 in Node but U+202F (narrow no-break space) in newer
 * V8/Safari. Both differences are invisible on screen and both are a hydration
 * mismatch on every row. Reading the UTC parts off the date sidesteps the whole
 * class of problem, and costs one string template.
 *
 * Renders `2 Oct 2026, 2:32 PM` — hour unpadded, because `2:32 PM` reads better
 * than `02:32 PM` and the meridiem already removes any 12-vs-24 ambiguity.
 */
function formatTimeUtc(date: Date): string {
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const meridiem = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 || 12;

  return `${hour12}:${minutes} ${meridiem}`;
}

/** An absolute date and time, or an empty string if the input is not a date. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);

  return Number.isNaN(date.getTime())
    ? ""
    : `${DATE_FORMAT.format(date)}, ${formatTimeUtc(date)}`;
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
