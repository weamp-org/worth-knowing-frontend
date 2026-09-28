import Link from "next/link";

/** Outbound link to the parent project. */
const WEAMP_URL = "https://weamp.org";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      {/* Same width as the header and the feed, so the left edges line up. */}
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Worth Knowing</p>

        <p>
          Built by{" "}
          <a
            href={WEAMP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-heading text-base font-normal hover:text-foreground"
          >
            WeAMP
            {/* Only the external link opens a new tab, so only it needs saying. */}
            <span className="sr-only"> (opens in new tab)</span>
          </a>{" "}
          and{" "}
          <Link href="/contributors" className="hover:text-foreground">
            open-source contributors
          </Link>
        </p>
      </div>
    </footer>
  );
}
