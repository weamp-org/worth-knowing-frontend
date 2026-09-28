import { z } from "zod";

import {
  MAX_TAG_LENGTH,
  MAX_TAGS,
  MAX_TITLE_LENGTH,
  MAX_URL_LENGTH,
  MAX_WHY_LENGTH,
  RESOURCE_TYPES,
} from "@/lib/resource-types";

/**
 * Mirrors the backend's `CreateResourceDto`.
 *
 * `accessType` is deliberately absent: the form does not ask for it and the
 * backend defaults it to `UNKNOWN`.
 */

/**
 * The backend validates URLs with `require_protocol` and `require_tld`, which
 * is stricter than zod's `.url()` — that one accepts `localhost:3000` and
 * `foo:bar`, both of which the DTO rejects. Mirroring the stricter rule keeps a
 * predictable URL from costing a round trip to be told no.
 */
function hasPublicHostname(value: string): boolean {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  // A hostname with a final label of two or more characters, which is what
  // `require_tld` is after. This also rejects a bare IP address, which has no
  // TLD to speak of.
  return /^([a-z0-9-]+\.)+[a-z0-9-]{2,}$/i.test(url.hostname);
}

export const resourceFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the resource a title.")
    .max(
      MAX_TITLE_LENGTH,
      `Keep the title to ${MAX_TITLE_LENGTH} characters or fewer.`,
    ),
  url: z
    .string()
    .trim()
    .min(1, "Paste a link to the resource.")
    .max(
      MAX_URL_LENGTH,
      `Keep the link to ${MAX_URL_LENGTH} characters or fewer.`,
    )
    // An empty field is `min(1)`'s business. Letting it fail both would put two
    // different messages under one input.
    .refine((value) => value.length === 0 || hasPublicHostname(value), {
      message: "Enter a full link, including https:// and a domain.",
    }),
  type: z.enum(RESOURCE_TYPES, {
    errorMap: () => ({ message: "Pick what kind of resource this is." }),
  }),
  why: z
    .string()
    .trim()
    .min(1, "Say why you think it is worth knowing.")
    .max(MAX_WHY_LENGTH, `Keep this to ${MAX_WHY_LENGTH} characters or fewer.`),
  tags: z
    .array(z.string().trim().min(1, "Tags cannot be empty."))
    .max(MAX_TAGS, `A resource can carry at most ${MAX_TAGS} tags.`)
    .refine(
      (tags) => tags.every((tag) => tag.length <= MAX_TAG_LENGTH),
      `Each tag has to be ${MAX_TAG_LENGTH} characters or fewer.`,
    ),
});

export type ResourceFormValues = z.infer<typeof resourceFormSchema>;
