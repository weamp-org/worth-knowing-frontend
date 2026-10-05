import type { Metadata } from "next";

/**
 * Static, so it prerenders. The data is two URLs rather than something fetched:
 * see the note below on why this does not read from the API.
 */
/**
 * `noindex`, deliberately, and it stays in the footer.
 *
 * This page is about *repository commit history* — two outbound links to GitHub
 * contributor graphs — under a title that reads "Contributors — Worth Knowing".
 * On a product whose whole proposition is curation by identifiable people, that
 * is the wrong occupant of the phrase: the people who built the software are not
 * the people whose judgement the site is for, and the page links zero times into
 * the product.
 *
 * It is also the only in-app footer link besides WeAMP, so it is the site's
 * second-most-linked page — which is what made this worth acting on rather than
 * ignoring. Being linked from everywhere is a reason to be *correct* about what it
 * claims to be, and the honest claim here is "this is a repository page".
 *
 * Rebuilding it into a real contributor hub — indexing every profile and public
 * collection on the site — would be a genuine improvement, and it is a **product**
 * feature rather than an SEO one. It is deferred rather than half-done here.
 */
export const metadata: Metadata = {
  title: "Contributors — Worth Knowing",
  description: "The people who have built Worth Knowing.",
  robots: { index: false, follow: true },
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
