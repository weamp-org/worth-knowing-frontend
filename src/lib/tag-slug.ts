/**
 * A client-side preview of the tag slug the backend will produce.
 *
 * The backend is authoritative — see `worth-knowing-backend/src/tags/slugify.util.ts`
 * — but the form needs to show the result before submitting, so the same
 * algorithm is restated here. It is a preview, not an identity check: nothing
 * downstream trusts this value, and the backend re-slugifies whatever it
 * receives.
 */

/** Combining marks NFKD splits off, e.g. the acute in `é`. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Anything the allowlist cannot represent becomes a hyphen. */
const DISALLOWED_RUN = /[^a-z0-9.+#-]+/g;
const REPEATED_HYPHENS = /-{2,}/g;
const EDGE_HYPHENS = /^-+|-+$/g;

/** Any Unicode letter or digit, in any script. */
const UNICODE_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

/** A character outside printable ASCII that survived folding. */
const NON_ASCII_LETTER_OR_NUMBER = /[^ -~]/u;

export const TAG_SLUG_MIN_LENGTH = 2;
export const TAG_SLUG_MAX_LENGTH = 40;

/**
 * Normalizes a name the way the backend does.
 *
 * Never throws and never rejects — call {@link isUsableTagSlug} on the result.
 * Never returns `undefined`, so callers do not need a null branch.
 */
export function slugifyTag(name: string): string {
  return name
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .trim()
    .toLowerCase()
    .replace(DISALLOWED_RUN, "-")
    .replace(REPEATED_HYPHENS, "-")
    .replace(EDGE_HYPHENS, "");
}

/** Whether a slug is long enough to be a usable tag identity. */
export function isUsableTagSlug(slug: string): boolean {
  return (
    slug.length >= TAG_SLUG_MIN_LENGTH && slug.length <= TAG_SLUG_MAX_LENGTH
  );
}

/**
 * Whether a name is written in a script that cannot become a slug.
 *
 * Lets the form say "this script isn't supported yet" rather than showing an
 * empty preview, which would read as a bug.
 */
export function isUnsupportedScript(name: string): boolean {
  const folded = name.normalize("NFKD").replace(COMBINING_MARKS, "");

  return (
    UNICODE_LETTER_OR_NUMBER.test(folded) &&
    NON_ASCII_LETTER_OR_NUMBER.test(folded)
  );
}
