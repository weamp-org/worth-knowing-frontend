import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { AnonymitySetting } from "@/components/anonymity-setting";
import { getMySettings } from "@/lib/settings-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings — Worth Knowing",
  description: "Your preferences for sharing on Worth Knowing.",
};

export default async function SettingsPage() {
  await auth.protect();

  // Falls back to the public default rather than blocking the page: a
  // contributor who cannot load settings should still be able to read them.
  const anonymousByDefault = await getMySettings()
    .then((settings) => settings.anonymousByDefault)
    .catch(() => false);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading text-4xl font-semibold tracking-wide">
        Settings
      </h1>
      <p className="mt-3 text-muted-foreground">
        How you appear on the things you share.
      </p>

      <div className="mt-8 border-t border-border pt-8">
        <AnonymitySetting initialValue={anonymousByDefault} />
      </div>
    </div>
  );
}
