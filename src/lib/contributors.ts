/**
 * Contributor credit, read from GitHub at build time.
 *
 * Worth Knowing spans two independently versioned repos, so neither repo's own
 * contributor graph is the whole story. Merging both here means someone who
 * only touched the backend still gets named, which a footer link to a single
 * repo cannot do.
 *
 * The fallback list is what a build gets when the API is unreachable, so a
 * network blip degrades the page rather than breaking the build. Update it by
 * hand when someone new contributes; it does not need to stay in sync, since
 * the live list is preferred whenever the fetch succeeds.
 */

export interface Contributor {
  /** GitHub login, e.g. `gideonadeti`. */
  login: string;
  /**
   * Always a string: falls back to the login when the account has no display
   * name set, so callers never have to handle `null`.
   */
  name: string;
  avatarUrl: string;
  profileUrl: string;
  /** Which repo they appear in, so a name can be credited to the right one. */
  repos: string[];
}

/** Repos worth knowing is built from, in the order they are credited. */
const REPOS = [
  { name: "Frontend", slug: "worth-knowing-frontend" },
  { name: "Backend", slug: "worth-knowing-backend" },
] as const;

const API_ROOT = "https://api.github.com/repos/weamp-org";

/** Used when the API cannot be reached. */
const FALLBACK: Contributor[] = [
  {
    login: "gideonadeti",
    name: "Gideon Adeti",
    avatarUrl: "https://avatars.githubusercontent.com/u/178742105?v=4",
    profileUrl: "https://github.com/gideonadeti",
    repos: ["Frontend", "Backend"],
  },
];

/** GitHub returns `null` for accounts with no display name set. */
function displayName(login: string, name: string | null): string {
  return name?.trim() || login;
}

async function fetchRepoContributors(slug: string): Promise<
  {
    login: string;
    name: string | null;
    avatarUrl: string;
    profileUrl: string;
  }[]
> {
  const response = await fetch(`${API_ROOT}/${slug}/contributors`, {
    // Contributors rarely change, and a rebuild should not re-hit the API.
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} for ${slug}`);
  }

  const body: unknown = await response.json();

  if (!Array.isArray(body)) {
    throw new Error(`Unexpected contributors payload for ${slug}`);
  }

  return body.flatMap((entry) => {
    // The payload is untyped input from the network, so narrow it rather than
    // casting — a field being absent should drop the entry, not render `null`
    // into an `src`.
    if (typeof entry !== "object" || entry === null) return [];

    const record = entry as Record<string, unknown>;
    const login = record.login;
    const avatarUrl = record.avatar_url;
    const profileUrl = record.html_url;

    if (
      typeof login !== "string" ||
      typeof avatarUrl !== "string" ||
      typeof profileUrl !== "string"
    ) {
      return [];
    }

    return [
      {
        login,
        name: typeof record.name === "string" ? record.name : null,
        avatarUrl,
        profileUrl,
      },
    ];
  });
}

/**
 * Contributors across both repos, merged by GitHub login.
 *
 * A person who committed to both is credited once, carrying both repo labels —
 * which is the whole reason this exists rather than two separate lists.
 */
export async function getContributors(): Promise<Contributor[]> {
  try {
    const perRepo = await Promise.all(
      REPOS.map(async (repo) => ({
        repo: repo.name,
        entries: await fetchRepoContributors(repo.slug),
      })),
    );

    const byLogin = new Map<string, Contributor>();

    for (const { repo, entries } of perRepo) {
      for (const entry of entries) {
        // Resolved once, here, so a name is never `null` further down.
        const name = displayName(entry.login, entry.name);
        const existing = byLogin.get(entry.login);

        if (existing) {
          // Already credited, but they touched another repo too.
          if (!existing.repos.includes(repo)) {
            existing.repos.push(repo);
          }
          continue;
        }

        byLogin.set(entry.login, {
          login: entry.login,
          name,
          avatarUrl: entry.avatarUrl,
          profileUrl: entry.profileUrl,
          repos: [repo],
        });
      }
    }

    const merged = [...byLogin.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    // A successful fetch returning nothing means the repos genuinely have no
    // contributors, which is not a reason to show the stale fallback.
    return merged.length > 0 ? merged : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
