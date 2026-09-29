import { z } from "zod";

import { MAX_BIO_LENGTH } from "@/lib/resource-types";
import {
  isUnsupportedScript,
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/lib/username";

/**
 * Why a username cannot be saved, or null when it can.
 *
 * Checks run in the same order the backend runs them, so the message under the
 * field is the one the server would have produced. The rules themselves live in
 * `username.ts` rather than being restated as zod patterns: the backend folds
 * accents and lowercases *before* applying its allowlist, so a pattern would
 * have to duplicate that folding to avoid rejecting `Café` and `AdaL` — and a
 * second copy of those rules is a second copy to get wrong.
 *
 * The backend re-validates everything here regardless. A disagreement shows up as
 * a 400 with a readable message, not as bad data.
 */
function usernameProblem(value: string): string | null {
  if (value.length === 0) return null;

  if (isUnsupportedScript(value)) {
    return "Usernames in that script are not supported yet. Letters and numbers from the Latin alphabet, and underscores, are what we can use right now.";
  }

  const normalized = normalizeUsername(value);

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
 * Mirrors the backend's `UpdateMyProfileDto`.
 *
 * Privacy is not in here: it is a toggle that saves on change, not a field in a
 * form — see `profile-privacy-setting.tsx`.
 */
export const profileFormSchema = z
  .object({
    /**
     * Optional, and an empty value means "leave it alone".
     *
     * Not `min(1)`. The field is optional and an unclaimed username is a normal
     * state, so an untouched input has to be submittable. Requiring one here
     * would make saving a bio impossible before a username is claimed, which is a
     * worse outcome than a profile that exists without a handle.
     */
    username: z.string().trim(),
    /**
     * Empty is legitimate and clears the field, so no `min(1)` — unlike the
     * username, this is prose rather than a handle, and blank is what "no bio"
     * looks like.
     */
    bio: z
      .string()
      .trim()
      .max(
        MAX_BIO_LENGTH,
        `Keep this to ${MAX_BIO_LENGTH} characters or fewer.`,
      ),
  })
  .superRefine((values, ctx) => {
    // A `refine` on the field could only carry one generic message; this way the
    // specific reason lands on the username path, under the right input.
    const problem = usernameProblem(values.username);

    if (problem) {
      ctx.addIssue({ code: "custom", message: problem, path: ["username"] });
    }
  });

export { usernameProblem };

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
