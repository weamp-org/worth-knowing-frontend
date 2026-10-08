import { ExternalLinkIcon } from "lucide-react";

/**
 * An outbound resource link: the hostname plus the glyph that says it leaves
 * the site.
 *
 * A `target="_blank"` link with nothing but grey text gives a sighted reader no
 * warning that a tap leaves the app — screen readers already get one (the
 * `"(opens in a new tab)"` text on the footer and contributors links), so this
 * is the visual half of the same promise. The underline stays on the hostname
 * only; underlining the glyph too would read as decoration rather than a link.
 *
 * One component rather than the icon pasted per call site, because the feed
 * card and the resource page must keep announcing outbound links the same way.
 */
export function OutboundLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <span className="underline underline-offset-4">{children}</span>
      <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
}
