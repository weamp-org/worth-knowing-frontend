import type { Metadata } from "next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { getContributors } from "@/lib/contributors";

/**
 * Reads GitHub at build time, so this cannot be prerendered — there is nothing
 * to bake into a static page.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contributors — Worth Knowing",
  description: "The people who have built Worth Knowing.",
};

export default async function ContributorsPage() {
  const contributors = await getContributors();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading text-4xl font-semibold tracking-wide">
        Contributors
      </h1>
      <p className="mt-3 text-muted-foreground">
        Worth Knowing is built in the open. These are the people who have
        committed to it.
      </p>

      {contributors.length === 0 ? (
        <Empty className="mt-8 border">
          <EmptyHeader>
            <EmptyTitle>No contributors yet</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {contributors.map((contributor) => (
            <li key={contributor.login} className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={contributor.avatarUrl} alt="" />
                {/* Initials, so a failed avatar image still shows a name. */}
                <AvatarFallback>
                  {contributor.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col">
                <a
                  href={contributor.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                >
                  {contributor.name}
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
                <span className="text-xs text-muted-foreground">
                  {contributor.repos.join(" · ")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
