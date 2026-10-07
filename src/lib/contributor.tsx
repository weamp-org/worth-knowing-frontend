import { Avatar } from "@/components/avatar";
import { ContributorHoverCard } from "@/components/contributor-hover-card";

/**
 * What a contributor with no resolvable name is called in a byline.
 *
 * Only reachable for an account with neither a Clerk name nor a claimed handle,
 * which `/share` makes impossible — but the type says `string | null`, and a
 * type is not a runtime guarantee. Phrased in step with the existing "a
 * contributor who has since left", and deliberately *not* the word "anonymous",
 * which in this product means a specific, deliberate choice to withhold a name.
 */
export const UNNAMED_CONTRIBUTOR = "a Worth Knowing member";

/**
 * How a contribution's author is described.
 *
 * Three states, and the distinction matters: a resource with no contributor can
 * mean the author chose privacy, or that their account was deleted. Only
 * `isAnonymous` tells them apart, and saying "anonymous" about somebody who
 * left would be quietly untrue.
 */
export function contributorLabel(resource: {
  contributor: { name: string | null } | null;
  isAnonymous: boolean;
}): string {
  if (resource.contributor) {
    return `Shared by ${resource.contributor.name ?? UNNAMED_CONTRIBUTOR}`;
  }

  return resource.isAnonymous
    ? "Shared anonymously"
    : "Shared by a contributor who has since left";
}

/**
 * The byline itself: the name, linked when there is a profile to link to.
 *
 * Privacy here withdraws the *link*, not the name. The contributor chose to share
 * these contributions with their name attached and never asked to be
 * unattributed — that is what `isAnonymous` is for, and it arrives as a null
 * `contributor` instead. So a private profile renders as plain text with the name
 * still there, and a link is only rendered when the server sent a path it
 * resolved itself.
 *
 * That is the whole rule: `profilePath` is a string, link; null, plain text. It
 * is deliberately not re-derived here from separate privacy fields, because a
 * client that gets that wrong produces a link to a 404.
 *
 * **The avatar is not part of that link, and that is deliberate.** `imageUrl` and
 * `profilePath` come from the same contributor summary, but they answer different
 * questions: the picture is *whose* this is, the path is *whether you may go
 * there*. Making the avatar a second link to the same place would mean two tab
 * stops per card for one destination, and — worse — it would put a clickable
 * face next to a name for somebody who set `isProfilePrivate`, which reads as
 * "their profile is one click away" when the server has just said it is not. So
 * the face is decorative and the name carries the link, exactly as before.
 *
 * The avatar does not appear for a null `contributor` at all, and there is no
 * fallback for that case. An anonymous contribution has no author to depict, and
 * a grey circle standing in for one would imply a person the backend has
 * deliberately withheld.
 */
export function ContributorByline({
  resource,
  avatarSize = "sm",
}: {
  resource: {
    contributor: {
      name: string | null;
      imageUrl: string | null;
      profilePath: string | null;
    } | null;
    isAnonymous: boolean;
  };
  /**
   * The card footer is `text-xs` next to `text-xs`; the resource page's is
   * `text-sm`. One component, two densities — so the size is the caller's to
   * pick, defaulting to the one used in more places.
   */
  avatarSize?: "sm" | "md";
}) {
  if (!resource.contributor) {
    return <span>{contributorLabel(resource)}</span>;
  }

  const { name, imageUrl, profilePath } = resource.contributor;
  const label = name ?? UNNAMED_CONTRIBUTOR;

  const avatar = <Avatar imageUrl={imageUrl} name={name} size={avatarSize} />;

  if (!profilePath) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {avatar}
        <span>Shared by {label}</span>
      </span>
    );
  }

  // The hover card is a client component, so this branch — and only this branch —
  // crosses the server/client boundary. Everything above it stays server-rendered,
  // which is what keeps a page of anonymous and private-profile bylines free of
  // client JavaScript. The props are a string, a string, a string-or-null and a
  // size union, all of which cross cleanly.
  return (
    <ContributorHoverCard
      profilePath={profilePath}
      name={label}
      imageUrl={imageUrl}
      avatarSize={avatarSize}
    />
  );
}
