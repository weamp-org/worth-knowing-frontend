import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { AnonymitySetting } from "@/components/anonymity-setting";
import { ThemeSetting } from "@/components/theme-setting";
import { getMySettingsForViewer } from "@/lib/settings-queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings — Worth Knowing",
  description: "Your preferences for sharing on Worth Knowing.",
};

export default async function SettingsPage() {
  await auth.protect();

  // Not caught. A failed read used to be swallowed and rendered as `false`,
  // which showed the switch in the wrong position and read as a save that did
  // not stick. Letting it reach the error boundary is the honest outcome.
  const { anonymousByDefault } = await getMySettingsForViewer();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading text-4xl font-semibold tracking-wide">
        Settings
      </h1>
      <p className="mt-3 text-muted-foreground">
        How you appear on the things you share.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        <AnonymitySetting initialValue={anonymousByDefault} />

        <div className="border-t border-border pt-8">
          <ThemeSetting />
        </div>
      </div>
    </div>
  );
}
