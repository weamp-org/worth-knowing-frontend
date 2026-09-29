"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { UserRoundCogIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Display name and avatar — the account fields Clerk owns.
 *
 * None of them are editable through our API. The backend's `user.updated`
 * webhook rewrites `name`, `email` and `imageUrl` on every Clerk event, so a
 * local write would be reverted without warning, which is why
 * `UpdateMyProfileDto` has no field for them and the backend's
 * `forbidNonWhitelisted` pipe answers 400 if one is sent.
 *
 * So this opens Clerk's own profile UI rather than reimplementing two of its
 * forms — and in a **modal**, which is where Clerk's UI belongs.
 *
 * It used to embed `<UserProfile />` inline on this page. That was wrong, and not
 * only aesthetically: `<UserProfile />` is a whole standalone application
 * designed to own a full page, so inside a `max-w-2xl` column it rendered
 * cramped and clipped. Overriding its colours with `[&_*]:text-foreground` made
 * it worse and was a genuine dark-mode bug — it forced our foreground onto
 * Clerk's text while Clerk's own background stayed fixed, which in dark mode is
 * dark text on a light surface. `docs/theming.md` is explicit that this app's
 * theming story is CSS variables, and a component that does not consume them
 * cannot be made to.
 *
 * The modal sidesteps all of it. Clerk's UI renders inside its own overlay, at
 * its own width, with its own styling — and it is only downloaded once somebody
 * actually asks for it.
 *
 * Values come from `useUser()` rather than the profile our backend holds, so
 * they are live. The mirrored copy on `User` can lag a change by however long the
 * webhook takes, and a settings page showing the old name next to a "manage"
 * button is worse than no value at all.
 */
export function AccountDetails() {
  const clerk = useClerk();
  const { user, isLoaded } = useUser();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {user?.imageUrl ? (
          // A 40px circle from a Clerk-hosted CDN, where the optimizer earns
          // nothing and would need a remote pattern per possible host.
          // biome-ignore lint/performance/noImgElement: see above
          <img
            src={user.imageUrl}
            alt=""
            className="size-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted"
          >
            <UserRoundCogIcon className="size-5 text-muted-foreground" />
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          <p className="font-medium">
            {/* Empty until Clerk loads, rather than a placeholder that would be
                wrong for every signed-in user with a real name. */}
            {isLoaded ? (user?.fullName ?? "No name set") : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            Display name and profile picture
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        // Clerk's own modal. Disabled while the user object is still loading,
        // because `openUserProfile` needs it mounted and throws otherwise.
        disabled={!isLoaded}
        onClick={() => clerk.openUserProfile()}
      >
        Manage account
      </Button>
    </div>
  );
}
