import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ShareResourceForm } from "@/components/share-resource-form";
import { getResourceForViewerOrNotFound } from "@/lib/resource-queries";

export const dynamic = "force-dynamic";

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth.protect();

  // Fetched as the signed-in user, not anonymously. The backend redacts an
  // anonymous resource for everyone but its owner, so a plain public read would
  // come back without `contributorId` and lock the owner out of their own post.
  const resource = await getResourceForViewerOrNotFound(id);

  // The backend enforces this too, but redirecting here avoids rendering a form
  // whose save is guaranteed to be rejected.
  if (resource.contributorId !== userId) {
    redirect(`/resources/${id}`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading text-3xl font-semibold tracking-wide">
        Edit resource
      </h1>
      <ShareResourceForm resource={resource} />
    </div>
  );
}
