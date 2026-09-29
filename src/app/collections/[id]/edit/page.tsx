import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { CollectionForm } from "@/components/collection-form";
import { getCollectionOrNotFound } from "@/lib/collection-queries";

/**
 * Per-viewer: the form pre-fills from the stored collection, and a private one
 * resolves only for its owner.
 *
 * No `loading.tsx` either, for the same reason as the detail page — this one also
 * reaches `notFound()`.
 */
export const dynamic = "force-dynamic";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Gated before the fetch, so a signed-out reader never reaches the backend.
  // The returned id is deliberately not compared: `isOwner` on the response is
  // the backend's decision, and the response carries no id to compare against.
  await auth.protect();

  // Fetched with a session, so a private collection is not redacted for its own
  // owner. The form has to know the stored `isPrivate` to pre-fill the switch
  // truthfully.
  const collection = await getCollectionOrNotFound(id);

  // The backend enforces this too, but redirecting here avoids rendering a form
  // whose save is guaranteed to be rejected. `isOwner` rather than a client-side
  // id comparison — the response carries no id to compare against, which is the
  // whole reason the field exists.
  if (!collection.isOwner) {
    redirect(`/collections/${id}`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading text-3xl font-semibold tracking-wide">
        Edit collection
      </h1>
      <CollectionForm collection={collection} />
    </div>
  );
}
