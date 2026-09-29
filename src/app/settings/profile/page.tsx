import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { AccountDetails } from "@/components/account-details";
import { ProfileForm } from "@/components/profile-form";
import { ProfilePrivacySetting } from "@/components/profile-privacy-setting";
import { Separator } from "@/components/ui/separator";
import { getCachedMyProfile } from "@/lib/profile-queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile — Worth Knowing",
  description: "Your username, bio, and who can see your profile.",
};

/**
 * C0 control characters and space, which the URL spec **removes** before parsing.
 *
 * This is the whole reason the guard below normalises first. `"/\t/evil.com"`
 * starts with a slash and so passes a naive `startsWith("/")` test — but a tab is
 * stripped during URL parsing, leaving `/evil.com`, and the two slashes that
 * follow are then read as protocol-relative. The browser sends the person to
 * `https://evil.com/` while the string that was checked looked harmless.
 *
 * Tab, LF and CR are the set the spec removes from anywhere in a URL; the
 * leading/trailing C0-and-space trim is why the replace covers the whole string
 * rather than just its edges.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching the URL spec
const STRIPPED_BY_URL_PARSER = /[\u0000-\u0020]/g;

/**
 * Where to send somebody after a successful save, if they arrived from somewhere.
 *
 * This value becomes a `router.push` target, so it is **validated, not trusted**.
 * A query parameter used as a redirect is the classic open-redirect shape.
 *
 * The check runs on the string the *browser* will see, not the raw parameter —
 * see {@link STRIPPED_BY_URL_PARSER} for why that distinction is the whole game.
 * After normalising, a value is accepted only if it starts with a single `/`.
 * That rejects the three shapes the browser would send off-origin:
 *
 * - `//evil.com`  — protocol-relative
 * - `/\evil.com`  — backslash, which several browsers normalise to `/`
 * - `http://evil.com` — absolute, and does not start with `/` at all
 *
 * Anything else is discarded and the page behaves as if no `next` was sent, which
 * costs nothing — the fallback is a refresh on the page you are already on.
 *
 * The result is handed to `ProfileForm` as `redirectTo`, which owns the actual
 * navigation because it is a client component and already holds a router. The
 * validation stays here, on the server, so an unvalidated value never reaches
 * the client at all.
 */
function safeNext(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const path = value.replace(STRIPPED_BY_URL_PARSER, "");

  if (!path.startsWith("/")) return undefined;
  if (path.startsWith("//")) return undefined;
  if (path.startsWith("/\\")) return undefined;

  return path;
}

export default async function ProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await auth.protect();

  // Not caught. A failed read used to be swallowed and rendered as `false`, which
  // showed the switch in the wrong position and read as a save that did not
  // stick. Letting it reach the error boundary is the honest outcome.
  const profile = await getCachedMyProfile();
  const next = safeNext((await searchParams).next);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading text-4xl font-semibold tracking-wide">
        Profile
      </h1>
      <p className="mt-3 text-muted-foreground">
        How you appear as a person here, and who can find you.
      </p>

      {/*
        Only when they were sent here by something. A permanent banner on a page
        people visit deliberately is noise, and the usual reason to be on this
        page — changing something that is already fine — deserves no
        explanation.
      */}
      {next === "/share" ? (
        <p className="mt-4 rounded-lg border border-border bg-muted/50 p-4 text-sm">
          You came here to share something. Set a username and you will go
          straight back to the form.
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-10">
        {/*
          Clerk's own account UI, first, because it owns the display name and
          avatar — the two things a person most wants to change about a profile,
          and the two they cannot change anywhere else. It opens as a modal rather
          than being embedded, so Clerk's design system stays inside Clerk's
          overlay instead of being forced to match this page.
        */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Name and photo
          </h2>
          <AccountDetails />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Username and bio
          </h2>
          {/*
            Keyed on the stored handle, so a rename remounts the form with the new
            value as its baseline. `useForm` reads `defaultValues` only on mount,
            and neither `router.refresh()` nor `router.push()` remounts — without
            this, saving a new username would leave the field showing the old one
            while the baseline moved underneath it, and the Save button would stay
            enabled forever after its one useful click.
          */}
          <ProfileForm
            key={profile.usernameLower ?? "unclaimed"}
            profile={profile}
            redirectTo={next}
          />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Privacy
          </h2>
          <ProfilePrivacySetting
            initialValue={profile.isProfilePrivate}
            usernameLower={profile.usernameLower}
          />
        </section>
      </div>
    </div>
  );
}
