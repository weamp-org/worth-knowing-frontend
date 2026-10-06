"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import type { MouseEvent, ReactNode, Ref } from "react";

import {
  type DiscoverySource,
  setDiscoverySource,
  trackResourceOpened,
} from "@/lib/analytics";

/**
 * Internal resource links that record where discovery came from.
 *
 * Server-rendered listings cannot take `onClick`, so these small client
 * wrappers carry the click. The navigation itself is an ordinary Next `Link` —
 * no behavior, styling, or destination changes. Firing is fire-and-forget:
 * nothing awaits it and nothing blocks on it.
 */
export function DiscoveryLink({
  href,
  source,
  className,
  children,
}: {
  href: string;
  source: DiscoverySource;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => setDiscoverySource(source)}
    >
      {children}
    </Link>
  );
}

/**
 * Outbound links to the underlying resource. Records only the destination
 * host — never the full URL — plus which surface the reader came from.
 *
 * In a listing the surface is passed explicitly; on the detail page it is the
 * source of the view currently on screen. Accepts and forwards `ref` and extra
 * anchor props so it can sit inside `Button asChild` like a plain `<a>`.
 */
export function OutboundResourceLink({
  url,
  resourceId,
  location,
  source,
  className,
  children,
  onClick,
  ref,
  ...rest
}: {
  url: string;
  resourceId: string;
  location: "card" | "detail";
  source?: DiscoverySource;
  className?: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  ref?: Ref<HTMLAnchorElement>;
} & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "target" | "rel" | "onClick" | "className" | "ref"
>) {
  const { isSignedIn } = useAuth();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      ref={ref}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        if (source) setDiscoverySource(source);
        trackResourceOpened({
          resourceId,
          location,
          url,
          ...(source ? { source } : {}),
          isAuthenticated: isSignedIn === true,
        });
      }}
    >
      {children}
    </a>
  );
}
