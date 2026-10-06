"use client";

import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * The site-wide error boundary.
 *
 * `reset()` stays the primary action: most render faults here are transient
 * (a failed fetch, a dropped connection) and retrying resolves them. The
 * secondary way out matters for the deterministic fault — a page that throws
 * on every render would otherwise offer nothing but a button that fails again.
 *
 * The `error` itself is never rendered. No message, no digest, no stack — a
 * reader cannot act on any of them, and a message may carry backend detail
 * that was never meant for the page.
 */
// biome-ignore lint/suspicious/noShadowRestrictedNames: Next.js error boundary convention
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <Empty className="border-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>
            This one is on our end, not yours. Trying again usually fixes it.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button variant="outline" onClick={() => reset()}>
            Try again
          </Button>
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
