import { auth } from "@clerk/nextjs/server";

import { ShareResourceForm } from "@/components/share-resource-form";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  // Redirects to the sign-in flow when signed out.
  await auth.protect();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading text-3xl font-semibold tracking-wide">
        Share something
      </h1>
      <ShareResourceForm />
    </div>
  );
}
