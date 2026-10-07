/**
 * Username rules, mirrored from the backend.
 *
 * Hand-maintained rather than shared: the two packages are independently
 * versioned with no shared types package, and this is a convenience so the form
 * can say "at least 3 characters" without a round trip. The backend is
 * authoritative — it re-validates everything here, and a disagreement between
 * the two would show up as a 400 on an otherwise acceptable handle.
 *
 * `worth-knowing-backend/src/users/username.util.ts` is the source of truth.
 */

/** Matches the backend's `USERNAME_MIN_LENGTH`. */
export const USERNAME_MIN_LENGTH = 3;

/** Matches the backend's `USERNAME_MAX_LENGTH` and the column width. */
export const USERNAME_MAX_LENGTH = 24;

/** Combining marks NFKD splits off, e.g. the acute in `é`. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * A character outside printable ASCII, matched on a name that has already been
 * folded — so anything left is a script with no Latin decomposition.
 */
const NON_ASCII_LETTER_OR_NUMBER = /[^ -~]/u;

/** Any Unicode letter or digit, in any script. */
const UNICODE_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

/**
 * Whether a typed username is written in a script we cannot represent.
 *
 * Reports a different problem from {@link usernameProblem}, which is the point:
 * "we don't support that script yet" is a gap with a fix attached, and "that
 * character is not allowed" is a typo.
 */
export function isUnsupportedScript(input: string): boolean {
  const folded = input.normalize("NFKD").replace(COMBINING_MARKS, "");

  return (
    UNICODE_LETTER_OR_NUMBER.test(folded) &&
    NON_ASCII_LETTER_OR_NUMBER.test(folded)
  );
}

/**
 * Normalizes a typed username to the form the backend will store.
 *
 * Folds accents and lowercases, matching `normalizeUsername` on the backend.
 * Only for previewing what will be saved — the stored identity is the
 * backend's answer, not this one.
 */
export function normalizeUsername(input: string): string {
  return input
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .trim()
    .toLowerCase();
}

/**
 * Why a username cannot be submitted, or null when it can.
 *
 * Mirrors the backend's checks in the same order, so the message shown is the
 * one the server would have produced. Returns a *reason* rather than a boolean
 * because a form needs to say which rule was broken.
 */
export function usernameProblem(input: string): string | null {
  if (input.length === 0) {
    return "Choose a username.";
  }

  if (isUnsupportedScript(input)) {
    return "Usernames in that script are not supported yet. Letters and numbers from the Latin alphabet, and underscores, are what we can use right now.";
  }

  const normalized = normalizeUsername(input);

  if (normalized.length < USERNAME_MIN_LENGTH) {
    return `A username must be at least ${USERNAME_MIN_LENGTH} characters.`;
  }

  if (normalized.length > USERNAME_MAX_LENGTH) {
    return `A username must be at most ${USERNAME_MAX_LENGTH} characters.`;
  }

  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return "Use lowercase letters, numbers and underscores only. Hyphens, spaces and other symbols are not allowed.";
  }

  if (/^[0-9]+$/.test(normalized)) {
    return "A username cannot be only numbers.";
  }

  return null;
}

/**
 * Suggests a starting username from whatever identifies the person.
 *
 * Derived rather than random, because a handle somebody recognises as their own
 * is one they will keep.
 *
 * Two sources, in order:
 *
 * 1. **Their Clerk display name.** What they called themselves.
 * 2. **The local part of their email.** For the many people who signed up
 *    without giving a name — which is the common case, since Clerk's sign-up
 *    normally only asks for an email. Without this the field would be blank for
 *    exactly the people the `/share` gate is stopping.
 *
 * Returns `null` when neither source yields something usable: a name in a script
 * we cannot spell produces no suggestion rather than a mangled one, and the
 * field simply starts empty for the person to type.
 *
 * No suffix loop, and no availability check. Availability is a server question,
 * and inventing `ada2` without knowing whether `ada` is free would be guessing.
 * The suggestion is shown as a **placeholder, never prefilled** — a prefilled
 * value is a value somebody can save without choosing, which turns a typo
 * correction into a 409 for a handle they never picked.
 */
export function suggestUsername({
  name,
  email,
}: {
  name?: string | null;
  email?: string | null;
}): string | null {
  const source = name?.trim() || emailLocalPart(email) || "";

  if (!source || isUnsupportedScript(source)) return null;

  const base = normalizeUsername(source)
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    // Leading digits are allowed, an all-digits source is not, and a handle
    // that is mostly separator is not a handle.
    .replace(/^([0-9])/, "_$1")
    .replace(/_+$/, "");

  if (base.length < USERNAME_MIN_LENGTH) return null;

  return base.slice(0, USERNAME_MAX_LENGTH);
}

/**
 * The part of an email before the `@`, or `null` when there isn't one.
 *
 * Only the local part, and only ever as a *suggestion* — this is not published
 * anywhere. Leaking it would put part of somebody's address on a public profile.
 */
function emailLocalPart(email?: string | null): string | null {
  if (!email) return null;

  const [local] = email.split("@");

  return local?.trim() || null;
}
