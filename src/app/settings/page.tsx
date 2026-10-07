import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";

import { AnonymitySetting } from "@/components/anonymity-setting";
import { ThemeSetting } from "@/components/theme-setting";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getMyUsername } from "@/lib/profile-queries";
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
  const [{ anonymousByDefault }, username] = await Promise.all([
    getMySettingsForViewer(),
    getMyUsername(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading text-4xl font-semibold tracking-wide">
        Settings
      </h1>
      <p className="mt-3 text-muted-foreground">
        How you appear on the things you share.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {/*
          Only surfaced while there is something to fix. Once a handle is claimed
          this is a page you visit deliberately, and a permanent card for it would
          be one more thing between a person and the toggle they came for.
        */}
        {!username ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex flex-col gap-1">
              <p className="font-medium">Choose a username</p>
              <p className="text-sm text-muted-foreground">
                Contributions are attributed to a profile, and a profile needs
                an address. You will be asked for one before you can share.
              </p>
            </div>
            <div>
              <Button asChild size="sm">
                <Link href="/settings/profile">Set your username</Link>
              </Button>
            </div>
          </div>
        ) : null}

        <AnonymitySetting initialValue={anonymousByDefault} />

        <Separator />

        <ThemeSetting />

        <Separator />

        {username ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Your profile lives at{" "}
              <Link
                href={`/u/${username}`}
                className="underline underline-offset-4 hover:text-foreground"
              >
                /u/{username}
              </Link>
              .
            </p>
            <div>
              <Button asChild size="sm" variant="outline">
                <Link href="/settings/profile">Edit profile</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
