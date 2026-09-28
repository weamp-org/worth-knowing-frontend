"use client";

import { PencilIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { isMyResource } from "@/lib/resources-api";

/**
 * Shows the edit link only once the backend confirms the resource is yours.
 *
 * The detail page is server-rendered, and a resource shared anonymously comes
 * back with its contributor withheld — so the page cannot tell from the payload
 * whether it owns it. Asking costs one small authenticated call, and until it
 * answers nothing is rendered, so an edit link never flashes on someone else's
 * post.
 */
export function EditResourceLink({ resourceId }: { resourceId: string }) {
  const [isMine, setIsMine] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // A signed-out reader gets a 401 here, which is expected rather than an
    // error worth surfacing — it just means there is nothing to show.
    isMyResource(resourceId)
      .then((mine) => {
        if (!cancelled) setIsMine(mine);
      })
      .catch(() => {
        if (!cancelled) setIsMine(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  if (!isMine) return null;

  return (
    <Button asChild variant="ghost" className="ml-auto">
      <Link href={`/resources/${resourceId}/edit`}>
        <PencilIcon />
        Edit
      </Link>
    </Button>
  );
}
