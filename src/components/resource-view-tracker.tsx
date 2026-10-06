"use client";

import { useEffect, useRef } from "react";

import { trackResourceViewed } from "@/lib/analytics";

/**
 * Fires `resource_viewed` once for a successfully rendered resource page.
 *
 * Mounted by the detail page itself, so a 404 or a failed load never fires —
 * there is no island to mount. The ref guard keeps React StrictMode's
 * double-effect from counting one view twice.
 */
export function ResourceViewTracker({
  resourceId,
  isAuthenticated,
}: {
  resourceId: string;
  isAuthenticated: boolean;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackResourceViewed(resourceId, isAuthenticated);
  }, [resourceId, isAuthenticated]);

  return null;
}
