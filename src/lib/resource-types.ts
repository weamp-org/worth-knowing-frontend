/**
 * Types mirroring the backend's resource API.
 *
 * The two packages are independently versioned with no shared types package
 * between them, so these are hand-maintained. They track:
 *
 *   - `worth-knowing-backend/prisma/schema.prisma` (ResourceType, AccessType)
 *   - `worth-knowing-backend/src/resources/dtos/resource-response.dto.ts`
 *   - `worth-knowing-backend/src/comments/dtos/comment-response.dto.ts`
 *   - `worth-knowing-backend/src/tags/dtos/tag-response.dto.ts`
 *   - `worth-knowing-backend/src/resources/dtos/create-resource.dto.ts`
 *
 * Dates are strings, not `Date`: everything here has crossed a JSON boundary.
 */

/** Matches the `ResourceType` enum. */
export const RESOURCE_TYPES = [
  "ARTICLE",
  "BOOK",
  "COURSE",
  "VIDEO",
  "PODCAST",
  "PLAYLIST",
  "TOOL",
  "RESEARCH_PAPER",
  "DATASET",
  "WEBSITE",
  "OTHER",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  ARTICLE: "Article",
  BOOK: "Book",
  COURSE: "Course",
  VIDEO: "Video",
  PODCAST: "Podcast",
  PLAYLIST: "Playlist",
  TOOL: "Tool",
  RESEARCH_PAPER: "Research paper",
  DATASET: "Dataset",
  WEBSITE: "Website",
  OTHER: "Other",
};

/** Matches the `AccessType` enum. */
export const ACCESS_TYPES = ["FREE", "PAID", "FREEMIUM", "UNKNOWN"] as const;

export type AccessType = (typeof ACCESS_TYPES)[number];

export const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  FREE: "Free",
  PAID: "Paid",
  FREEMIUM: "Freemium",
  UNKNOWN: "Not sure",
};

/**
 * The backend's own limits, restated so the form can reject input before
 * spending a round trip. `MAX_TAG_LENGTH` is the slug bound, not a display one.
 */
export const MAX_TITLE_LENGTH = 200;
export const MAX_URL_LENGTH = 2048;
export const MAX_WHY_LENGTH = 5000;
export const MAX_TAGS = 5;
export const MAX_TAG_LENGTH = 40;

export interface TagSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagSearchResult {
  id: string;
  name: string;
  slug: string;
  resourceCount: number;
}

export interface ContributorSummary {
  id: string;
  /**
   * The Clerk name, or failing that the handle claimed here.
   *
   * Resolved server-side and never a placeholder. Cannot be `null` for a real
   * contributor — `/share` gates on holding a handle — so the fallbacks below
   * are belt-and-braces rather than an expected path.
   */
  name: string | null;
  imageUrl: string | null;
  /**
   * Where to link this contributor, resolved by the server.
   *
   * `null` when there is nowhere to go: the profile is private, or the account
   * has never claimed a username. It is **not** null because the name is
   * hidden — a withheld name comes back as a null `contributor` instead, and
   * `isAnonymous` is what tells the two apart so the UI can word them
   * differently.
   *
   * The whole rule is "render a link when this is a string". Deriving it in the
   * client from separate privacy fields would mean re-implementing the server's
   * decision in every component that shows a byline, and getting one of them
   * wrong produces a link to a 404.
   */
  profilePath: string | null;
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
  accessType: AccessType;
  why: string;
  createdAt: string;
  updatedAt: string;
  /**
   * Null when the contributor asked to be withheld, or when their account was
   * deleted — the resource survives either way. `isAnonymous` distinguishes
   * the two, and the UI words them differently.
   */
  contributorId: string | null;
  contributor: ContributorSummary | null;
  /**
   * Whether the contributor asked not to be named. Present on the response so
   * a client can tell an anonymous contribution from a deleted contributor.
   */
  isAnonymous: boolean;
  tags: TagSummary[];
  /**
   * How many people saved this.
   *
   * Public, unlike every other field here. A signal of *interest* rather than of
   * quality — it says people came back for it, not that it is the best one here.
   *
   * Whether **you** saved it is not on this shape. That is per-viewer and comes
   * from `GET /saved/:resourceId`, so a public read and an owner's read can
   * never be confused for one another.
   */
  savedCount: number;
  /**
   * How many comments this resource has.
   *
   * Public, like `savedCount`, and not a signal of interest or quality — it says
   * only that people discussed it. Present so a page can render the count and a
   * link to the discussion without a second request.
   *
   * The comment list itself comes from `GET /resources/:id/comments`, not from
   * here.
   */
  commentCount: number;
}

export interface PaginatedResources {
  items: Resource[];
  nextCursor: string | null;
  /**
   * How many resources match, per filterable facet.
   *
   * **Every enum member is present**, including those with no matches: a facet at
   * zero is a real answer, and omitting it would make an option disappear exactly
   * when someone is deciding whether it is worth clicking.
   *
   * **Each facet ignores its own filter.** With `type=BOOK` active, `byType.ARTICLE`
   * counts articles matching the rest of the query, not `(0)`. A self-excluding
   * count would be true, would answer nothing, and would make the dropdown useless
   * precisely when it is being used to change its mind.
   *
   * In the same response as the page it describes rather than a separate call: a
   * count and the list beside it have to be true of the same moment, and two
   * requests could straddle a delete and disagree with no way to tell which is lying.
   */
  facets: ResourceFacets;
}

export interface ResourceFacets {
  byType: Record<ResourceType, number>;
  byAccessType: Record<AccessType, number>;
}

/**
 * The `POST /resources` body. Mirrors what the form sends, including
 * `accessType` — the backend would default an absent one to `UNKNOWN`.
 */
export interface ResourceInput {
  title: string;
  url: string;
  type: ResourceType;
  accessType: AccessType;
  why: string;
  tags: string[];
  /** Overrides the contributor's standing preference for this resource. */
  isAnonymous: boolean;
}

/** The caller's own preferences, from `GET /users/me/settings`. */
export interface MySettings {
  anonymousByDefault: boolean;
}

/**
 * A public profile, from `GET /users/:username` or `GET /users/me/profile`.
 *
 * Mirrors `worth-knowing-backend/src/users/dtos/profile-response.dto.ts`. The two
 * packages are independently versioned with no shared types package, so this is
 * hand-maintained. It tracks:
 *
 *   - `worth-knowing-backend/src/users/dtos/profile-response.dto.ts`
 *
 * Notably absent: any email, role, or Clerk user id. The backend selects a fixed
 * set of fields, and a client that starts expecting one of the others will get
 * `undefined` rather than a leak.
 */
export interface Profile {
  /**
   * The handle as typed, for display. `null` until claimed.
   * @example 'AdaL'
   */
  username: string | null;
  /** The lowercase identity, and what `/u/:username` matches. */
  usernameLower: string | null;
  /**
   * The Clerk display name, or failing that the handle claimed here.
   *
   * Resolved server-side, and never a placeholder — `null` only for an account
   * with neither, which means no contributions, since `/share` gates on holding
   * a handle.
   */
  name: string | null;
  imageUrl: string | null;
  bio: string | null;
  createdAt: string;
  /** Always false on a public read; a private profile 404s for non-owners. */
  isProfilePrivate: boolean;
  /** Counts only contributions that carry the contributor's name. */
  resourcesCount: number;
  /**
   * Whether the signed-in caller owns this profile.
   *
   * The backend decides this, because the response deliberately carries no
   * identifier for a client to compare against. Always true on
   * `GET /users/me/profile`, and false for a signed-out read.
   */
  isOwner: boolean;

  /**
   * The caller's own role. **Only on `GET /users/me/profile`** — the public read
   * omits the field entirely, which is why this is optional.
   *
   * Your own role, returned to you, so it is not a disclosure. It exists because the
   * header offers a moderation link only to admins, and because `/moderation` has to
   * tell "sign in" apart from "not allowed" before it renders either.
   *
   * Reported as `USER` rather than omitted, so a client branching on this never has
   * to tell an absent field apart from a real answer. On a public read the field is
   * missing — treat that as *unknown*, not as `USER`.
   */
  role?: UserRole;
}

/** Mirrors the backend's `UserRole`. */
export const USER_ROLES = ["USER", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * The bounds the backend enforces, restated so the form can reject input before
 * spending a round trip. Kept in step with `username.util.ts` on the backend.
 */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const MAX_BIO_LENGTH = 280;

/**
 * Mirrors the backend's `ResourceSort`.
 *
 * **Relevance is deliberately absent.** It is what you get by sending `q` and no
 * `sort`, not a value — see the note in `resources-api.ts`. An explicit sort
 * alongside `q` means "everything that matched, in this order".
 */
export const RESOURCE_SORTS = ["newest", "oldest", "title"] as const;

export type ResourceSort = (typeof RESOURCE_SORTS)[number];

export const RESOURCE_SORT_LABELS: Record<ResourceSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  title: "Title (A–Z)",
};

/**
 * Longest `q` the backend accepts, restated so the input can `maxLength` rather
 * than offering a query that comes back as a 400.
 *
 * Not a column width: the backend's bound caps how expensive a trigram comparison
 * may get, rather than limiting how long a title is.
 */
export const SEARCH_QUERY_MAX_LENGTH = 100;
