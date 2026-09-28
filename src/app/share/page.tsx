import { auth } from "@clerk/nextjs/server";

import { ShareResourceForm } from "@/components/share-resource-form";
import { getMySettingsForViewer } from "@/lib/settings-queries";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  // Redirects to the sign-in flow when signed out. `protect()` runs first so an
  // anonymous visitor never reaches the settings call below.
  await auth.protect();

  // Falls back to `null` rather than a boolean. This read is not load-bearing —
  // the contributor picks per resource anyway — but claiming the toggle
  // "matches your default" when the default was never read would be a lie, so
  // `null` means the copy drops the claim rather than inventing a default.
  const anonymousByDefault = await getMySettingsForViewer()
    .then((settings) => settings.anonymousByDefault)
    .catch(() => null);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading text-3xl font-semibold tracking-wide">
        Share something
      </h1>
      <ShareResourceForm anonymousByDefault={anonymousByDefault} />
    </div>
  );
}
