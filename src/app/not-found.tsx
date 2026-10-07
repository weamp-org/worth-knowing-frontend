import { CompassIcon } from "lucide-react";
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
 * The site-wide not-found page.
 *
 * One generic page for every case — a mistyped URL, a deleted resource, a
 * private collection probed by a stranger. It deliberately never says which:
 * distinguishing "private" from "nonexistent" would let anyone holding an ID
 * learn whether there is something behind it, and the privacy of a private
 * collection depends on that ambiguity.
 */
export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <Empty className="border-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CompassIcon />
          </EmptyMedia>
          <EmptyTitle>This page isn&apos;t here</EmptyTitle>
          <EmptyDescription>
            It may have been removed, or the link may be wrong. Everything worth
            knowing is still one step away.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/browse">Browse everything</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
