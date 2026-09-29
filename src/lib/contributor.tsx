import Link from "next/link";

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
 */
export function ContributorByline({
  resource,
}: {
  resource: {
    contributor: {
      name: string | null;
      profilePath: string | null;
    } | null;
    isAnonymous: boolean;
  };
}) {
  if (!resource.contributor) {
    return <span>{contributorLabel(resource)}</span>;
  }

  const { name, profilePath } = resource.contributor;
  const label = name ?? UNNAMED_CONTRIBUTOR;

  if (!profilePath) {
    return <span>Shared by {label}</span>;
  }

  return (
    <span>
      Shared by{" "}
      <Link href={profilePath} className="hover:underline">
        {label}
      </Link>
    </span>
  );
}
