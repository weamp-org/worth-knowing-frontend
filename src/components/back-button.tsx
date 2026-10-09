"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * History back, for pages that are reached from several places.
 *
 * A resource is opened from the feed, browse, a collection, a tag, or the
 * inbox — so no single destination link is honest, and the wordmark only ever
 * goes home. `router.back()` returns to wherever the reader actually came
 * from. For a direct entrant with no in-site history that is the previous
 * site, which is exactly what the browser's own back button would do.
 */
export function BackButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 text-muted-foreground"
      onClick={() => router.back()}
    >
      <ArrowLeftIcon aria-hidden="true" />
      Back
    </Button>
  );
}
