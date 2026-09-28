/**
 * Types mirroring the backend's resource API.
 *
 * The two packages are independently versioned with no shared types package
 * between them, so these are hand-maintained. They track:
 *
 *   - `worth-knowing-backend/prisma/schema.prisma` (ResourceType, AccessType)
 *   - `worth-knowing-backend/src/resources/dtos/resource-response.dto.ts`
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
  name: string;
  imageUrl: string | null;
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
}

export interface PaginatedResources {
  items: Resource[];
  nextCursor: string | null;
}

/**
 * The `POST /resources` body.
 *
 * `accessType` is absent on purpose: the form does not ask for it and the
 * backend defaults it to `UNKNOWN`.
 */
export interface ResourceInput {
  title: string;
  url: string;
  type: ResourceType;
  why: string;
  tags: string[];
  /** Overrides the contributor's standing preference for this resource. */
  isAnonymous: boolean;
}

/** The caller's own preferences, from `GET /users/me/settings`. */
export interface MySettings {
  anonymousByDefault: boolean;
}
