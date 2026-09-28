/**
 * How a contribution's author is described.
 *
 * Three states, and the distinction matters: a resource with no contributor can
 * mean the author chose privacy, or that their account was deleted. Only
 * `isAnonymous` tells them apart, and saying "anonymous" about somebody who
 * left would be quietly untrue.
 */
export function contributorLabel(resource: {
  contributor: { name: string } | null;
  isAnonymous: boolean;
}): string {
  if (resource.contributor) return `Shared by ${resource.contributor.name}`;

  return resource.isAnonymous
    ? "Shared anonymously"
    : "Shared by a contributor who has since left";
}
