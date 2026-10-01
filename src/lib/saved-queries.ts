import { auth } from "@clerk/nextjs/server";
import { cache } from "react";

import type { PaginatedResources } from "@/lib/resource-types";
import { isSaved, listSaved } from "@/lib/saved-api";

/**
 * Server-side reads for the saved list and the save button.
 *
 * `cache` dedupes within a single render pass, so a page that needs the same
 * answer in `generateMetadata` and its body fetches it once.
 */

/**
 * Whether the signed-in caller saved this resource.
 *
 * The token is fetched here rather than left to the shared Axios instance,
 * because that instance's JWT interceptor only exists in the browser bundle —
 * `AuthTokenSetter` installs it from a `useEffect`. A Server Component therefore
 * attaches the header itself, exactly as `getCachedMyCollections` does.
 *
 * Returns `false` for a signed-out reader rather than throwing: the button is
 * not rendered at all in that case, and the answer is a default rather than a
 * fact, so it must not be read as one.
 *
 * SSR'd on purpose. The button's whole job is to say whether this is already
 * saved, so it has to be right on first paint — a client fetch would leave it
 * reading "Save" until it resolved, which is the bug the collection picker had.
 */
export const getSavedStateForViewer = cache(
  async (resourceId: string, _viewerId: string): Promise<boolean> => {
    const { getToken } = await auth();

    return isSaved(resourceId, (await getToken()) ?? undefined);
  },
);

/**
 * Your saved resources, newest saved first.
 *
 * Token required — `/saved` is authenticated, unlike the resource routes.
 */
export async function getSavedForViewer(): Promise<PaginatedResources> {
  const { getToken } = await auth();

  return listSaved({ token: (await getToken()) ?? undefined });
}
