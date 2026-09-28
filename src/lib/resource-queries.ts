import axios from "axios";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Resource } from "@/lib/resource-types";
import { getResource } from "@/lib/resources-api";

/**
 * Server-side reads.
 *
 * `cache` dedupes within a single render pass, so a page that needs a resource
 * in both `generateMetadata` and its body fetches it once instead of twice.
 */
export const getCachedResource = cache((id: string) => getResource(id));

/**
 * Fetch a resource, turning a 404 into the app's 404 page.
 *
 * Anything else is rethrown. A backend that is down or erroring is a fault the
 * error boundary should report, not evidence that the resource does not exist —
 * collapsing both into `notFound()` would make an outage look like an empty
 * database.
 */
export async function getResourceOrNotFound(id: string): Promise<Resource> {
  try {
    return await getCachedResource(id);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      notFound();
    }

    throw error;
  }
}
