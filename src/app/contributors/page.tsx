import type { Metadata } from "next";

/**
 * Static, so it prerenders. The data is two URLs rather than something fetched:
 * see the note below on why this does not read from the API.
 */
export const metadata: Metadata = {
  title: "Contributors — Worth Knowing",
  description: "The people who have built Worth Knowing.",
};

/**
 * Worth Knowing spans two independently versioned repos, so neither one's own
 * contributor graph is the whole story — someone who only touched the backend
 * would be invisible in the frontend's graph.
 *
 * GitHub owns that data and paginates it correctly, so these point at its pages
 * rather than reproducing the list. An earlier version read the contributors
 * API and merged the two, which meant re-implementing pagination against a
 * 30-per-page default and a 60-requests-per-hour unauthenticated limit — and a
 * silent truncation past 30, where the page looked complete but was not.
 */
const REPOS = [
  {
    name: "Frontend",
    slug: "worth-knowing-frontend",
    description: "Next.js app: the feed, resource pages, and share forms.",
  },
  {
    name: "Backend",
    slug: "worth-knowing-backend",
    description: "NestJS API, Prisma, and PostgreSQL.",
  },
] as const;

export default function ContributorsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading text-4xl font-semibold tracking-wide">
        Contributors
      </h1>
      <p className="mt-3 text-muted-foreground">
        Worth Knowing is built in the open, across two repositories. Everyone
        who has committed to either one is listed by GitHub.
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {REPOS.map((repo) => (
          <li key={repo.slug}>
            <a
              href={`https://github.com/weamp-org/${repo.slug}/graphs/contributors`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-heading text-lg font-normal tracking-wide hover:underline"
            >
              {repo.name} contributors
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            <p className="text-sm text-muted-foreground">{repo.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
