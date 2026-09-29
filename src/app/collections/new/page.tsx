import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { CollectionForm } from "@/components/collection-form";

/**
 * Authenticated, and reads nothing, so it could be static — but it sits under a
 * layout tree that is `force-dynamic`, and being explicit costs nothing.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New collection — Worth Knowing",
  description: "Group resources that belong together.",
};

export default async function NewCollectionPage() {
  // Gated rather than redirected: a signed-out reader gets sent to sign in and
  // back, which is the right outcome for a page that is entirely a form.
  await auth.protect();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading text-3xl font-semibold tracking-wide">
        New collection
      </h1>
      <CollectionForm />
    </div>
  );
}
