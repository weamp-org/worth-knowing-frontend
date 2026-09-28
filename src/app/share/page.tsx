import { auth } from "@clerk/nextjs/server";

import { ShareResourceForm } from "@/components/share-resource-form";
import { getMySettings } from "@/lib/settings-api";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  // Redirects to the sign-in flow when signed out. `protect()` runs first so an
  // anonymous visitor never reaches the settings call below.
  await auth.protect();

  // The form's initial value. A failure here should not block sharing — the
  // backend falls back to the stored preference if the form omits the field
  // anyway, and the worst case is a checkbox in the default position.
  const anonymousByDefault = await getMySettings()
    .then((settings) => settings.anonymousByDefault)
    .catch(() => false);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading text-3xl font-semibold tracking-wide">
        Share something
      </h1>
      <ShareResourceForm anonymousByDefault={anonymousByDefault} />
    </div>
  );
}
