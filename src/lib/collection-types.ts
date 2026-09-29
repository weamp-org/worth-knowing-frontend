/**
 * Types mirroring the backend's collection API.
 *
 * Hand-maintained, like `resource-types.ts` — the two packages are independently
 * versioned with no shared types package between them. These track:
 *
 *   - `worth-knowing-backend/src/collections/dtos/collection-response.dto.ts`
 *   - `worth-knowing-backend/src/collections/dtos/create-collection.dto.ts`
 *   - `worth-knowing-backend/src/collections/dtos/list-collections-query.dto.ts`
 *
 * Dates are strings, not `Date`: everything here has crossed a JSON boundary.
 *
 * In a separate file from `resource-types.ts` rather than appended to it, because
 * that file's header says it mirrors the *resource* API. A collection holds
 * resources, but the two shapes have almost nothing in common.
 */

/**
 * The backend's own limits, restated so the form can reject input before spending
 * a round trip. Both are the column bounds.
 */
export const MAX_COLLECTION_TITLE_LENGTH = 120;
export const MAX_COLLECTION_DESCRIPTION_LENGTH = 500;

/**
 * The owner of a collection.
 *
 * Never withheld, and never anonymous. A collection is a statement by somebody
 * about what they think is worth knowing, and that is the whole point of the
 * page. Unlike a contribution there is no anonymous mode — there would be nothing
 * left to look at.
 */
export interface CollectionOwner {
  /**
   * The Clerk name, or failing that the handle claimed here.
   *
   * Resolved server-side and never a placeholder.
   */
  name: string | null;
  imageUrl: string | null;
  /**
   * Where to link this name, computed by the server.
   *
   * `null` when there is nowhere to go: the profile is private, or no username
   * has been claimed. It is **not** null because the name is hidden.
   *
   * The whole rule is "render a link when this is a string". Deriving it here
   * from separate privacy fields would mean re-implementing the server's decision
   * in every component that shows a byline, and getting one wrong produces a link
   * to a 404.
   */
  profilePath: string | null;
}

export interface Collection {
  id: string;
  /**
   * A short, human-readable name.
   * @example 'Read before starting research'
   */
  title: string;
  /**
   * Why these resources belong together, in the owner's own words. `null` when
   * the owner did not write one.
   */
  description: string | null;
  /**
   * Whether the collection is hidden from everybody but its owner.
   *
   * A private collection the caller does not own never renders — the backend
   * answers 404 rather than 403, so there is nothing to show.
   */
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  /** `null` only when the owner's account has been deleted. */
  owner: CollectionOwner | null;
  /** How many resources it holds. Counted, so a listing can show it. */
  resourceCount: number;
  /**
   * Whether the signed-in caller owns this collection.
   *
   * Decided by the backend, because the response carries no identifier to
   * compare against. Never infer this client-side.
   */
  isOwner: boolean;
}

export interface CollectionSummary extends Collection {
  /**
   * Whether this collection already holds the resource named by `?resourceId=`.
   *
   * `false` for every row when the client did not send that parameter. It is a
   * convenience flag for the picker, not a claim about anything: only send
   * `resourceId` when you actually have a resource in hand.
   */
  containsResource: boolean;
}

export interface PaginatedCollections {
  items: CollectionSummary[];
  nextCursor: string | null;
}

/** The `POST /collections` body. */
export interface CollectionInput {
  title: string;
  /**
   * Optional, and omitted entirely rather than sent empty when the owner did not
   * write one — so a `PATCH` that only renames cannot be read as clearing it.
   */
  description?: string;
  /**
   * Overrides the private-by-default column value.
   *
   * Always sent by the form, which has a value to send either way. Omitted only
   * by a caller that wants the schema to decide.
   */
  isPrivate?: boolean;
}
