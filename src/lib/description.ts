/**
 * Truncation for metadata descriptions.
 *
 * ## Why this exists rather than `.slice()`
 *
 * `why` is allowed to be 5,000 characters, so a raw `.slice(0, 160)` produced
 * snippets like *"the clearest explanation of how human institut"* — cut
 * mid-word, with no punctuation, reading as broken rather than as an excerpt.
 * Search results render whatever a description says verbatim, so a mid-word cut
 * is not a cosmetic problem: it is the only place some readers ever meet the
 * contributor's reasoning before deciding whether to click.
 *
 * ## The rules
 *
 * - **Cut on a word boundary**, so the result reads as a finished thought.
 * - **Append an ellipsis** only when something was actually removed, so a short
 *   `why` is reproduced whole.
 * - **Leave text that has no spaces alone.** A single 400-character "word" (a URL,
 *   a chemical name) has no boundary to cut on, and returning it intact beats
 *   returning nothing.
 */

/** Default target length. Roughly what a search snippet shows before truncating. */
export const DESCRIPTION_MAX_LENGTH = 160;

/** What a truncation ends with, so the excerpt reads as one. */
const ELLIPSIS = "…";

/**
 * Shortens `text` to at most `maxLength` characters, on a word boundary.
 *
 * `maxLength` bounds the **returned** string including the ellipsis, so the
 * result never exceeds what was asked for — which is what a snippet budget
 * means, and what `.slice()` got wrong by ignoring it.
 */
export function truncateDescription(
  text: string,
  maxLength: number = DESCRIPTION_MAX_LENGTH,
): string {
  const normalized = text.trim();

  if (normalized.length <= maxLength) return normalized;

  // Reserve room for the ellipsis, so the total still fits.
  const budget = maxLength - ELLIPSIS.length;
  const window = normalized.slice(0, budget);

  // `lastIndexOf` rather than a regex: no space in the window means the text has
  // no boundary to cut on, and the whole window is the honest answer.
  const lastSpace = window.lastIndexOf(" ");

  if (lastSpace === -1) return window.trimEnd() + ELLIPSIS;

  return window.slice(0, lastSpace).trimEnd() + ELLIPSIS;
}

/**
 * A metadata description from prose a contributor wrote, or `null` when there is
 * none.
 *
 * `null` rather than an empty string, because `description: ""` renders as a
 * blank snippet, which is worse than emitting nothing and letting the route's
 * own fallback stand.
 */
export function descriptionFrom(
  text: string | null | undefined,
  maxLength: number = DESCRIPTION_MAX_LENGTH,
): string | null {
  if (!text) return null;

  const truncated = truncateDescription(text, maxLength);

  return truncated.length > 0 ? truncated : null;
}
