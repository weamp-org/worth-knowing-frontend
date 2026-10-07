import { z } from "zod";

import {
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_TITLE_LENGTH,
} from "@/lib/collection-types";

/**
 * Mirrors the backend's `CreateCollectionDto`.
 *
 * One schema for both create and edit, switched on by the presence of a
 * `collection` prop — the same shape `share-resource-form.tsx` uses for a
 * resource, and for the same reason: two forms for one model means the two can
 * drift.
 */
export const collectionFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the collection a title.")
    .max(
      MAX_COLLECTION_TITLE_LENGTH,
      `Keep the title to ${MAX_COLLECTION_TITLE_LENGTH} characters or fewer.`,
    ),
  /**
   * Optional, and the affordance is the point: this is where the curator's
   * reason for the *grouping* goes, the same judgment as a resource's `why` one
   * level up. Blank is allowed and is not an error — a plain folder is a
   * legitimate thing to want, and a person who does not want to write a
   * paragraph should not be told to.
   *
   * Sent as an empty string rather than omitted, so a person who wrote something
   * and then deleted it actually clears it. Omitting the field on an edit would
   * leave the old text in place, which is the one outcome that would surprise
   * them.
   */
  description: z
    .string()
    .trim()
    .max(
      MAX_COLLECTION_DESCRIPTION_LENGTH,
      `Keep this to ${MAX_COLLECTION_DESCRIPTION_LENGTH} characters or fewer.`,
    ),
  /**
   * Always present in the payload. The backend defaults a create to private, but
   * the form has a value either way, so the choice is explicit — and a switch
   * that only sometimes sends its value is a switch that can be out of step with
   * what the database holds.
   */
  isPrivate: z.boolean(),
});

export type CollectionFormValues = z.infer<typeof collectionFormSchema>;
