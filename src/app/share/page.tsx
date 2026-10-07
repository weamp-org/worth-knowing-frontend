import { auth } from "@clerk/nextjs/server";
import { UserRoundIcon } from "lucide-react";
import Link from "next/link";

import { ShareResourceForm } from "@/components/share-resource-form";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getMyUsername } from "@/lib/profile-queries";
import { getMySettingsForViewer } from "@/lib/settings-queries";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  // Redirects to the sign-in flow when signed out. `protect()` runs first so an
  // anonymous visitor never reaches the profile or settings call below.
  await auth.protect();

  // Every contribution needs somewhere to point back to. A profile with no
  // username has no address, so the byline on the post would be a name with
  // nothing to click — the difference between a social product and a list with
  // names on it.
  //
  // This gate stays on the page rather than redirecting. A silent bounce to
  // `/settings/profile` reads as a broken app and loses the reason the person was
  // here; swapping the form for an explanation keeps the context and offers one
  // action instead.
  const username = await getMyUsername();

  if (!username) return <UsernameNeeded />;

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

/**
 * The one thing standing between this person and the form.
 *
 * Replaces the form rather than disabling it. A greyed-out share form is a lot of
 * dead surface — you can see exactly what you are missing, cannot touch any of
 * it, and still have to leave the page. One panel with one action says the same
 * thing without the frustration.
 *
 * `next` carries the intent to `/settings/profile`, so saving a username returns
 * them here to a working form instead of to a settings page with nothing left to
 * do. It is validated where it is read, not trusted here, because it becomes a
 * `router.push` target and an unvalidated query parameter on a redirect path is
 * how open redirects happen.
 */
function UsernameNeeded() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading text-3xl font-semibold tracking-wide">
        Share something
      </h1>

      <Empty className="mt-8 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UserRoundIcon />
          </EmptyMedia>
          <EmptyTitle>Choose a username first</EmptyTitle>
          <EmptyDescription>
            Contributions here are attributed to a profile, and a profile needs
            an address. Pick a username and you can come straight back to this
            form.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/settings/profile?next=/share">Choose a username</Link>
          </Button>
        </EmptyContent>
      </Empty>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        You can also change it later in{" "}
        <Link href="/settings" className="underline underline-offset-4">
          settings
        </Link>
        .
      </p>
    </div>
  );
}
