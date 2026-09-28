import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ShareResourceForm } from "@/components/share-resource-form";
import { getResourceOrNotFound } from "@/lib/resource-queries";

export const dynamic = "force-dynamic";

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth.protect();
  const resource = await getResourceOrNotFound(id);

  if (resource.contributorId !== userId) {
    // The backend does not check ownership on PATCH — see docs/resources.md —
    // so this guard is the only thing standing between the edit form and
    // somebody else's resource. It is a redirect rather than a 404 because the
    // resource does exist; the caller simply may not change it.
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
