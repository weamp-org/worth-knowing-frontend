"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getApiErrorMessage } from "@/lib/api-error";
import { updateMyProfile } from "@/lib/profile-api";

/**
 * Whether the profile page resolves for anybody but its owner.
 *
 * Saved on change, like `AnonymitySetting` — one toggle, and an explicit save
 * makes people assume it is not already saved. Disabled while the request is in
 * flight so a double toggle cannot race.
 *
 * The description is the load-bearing part of this component. "Private" on a
 * social profile reads as "you will disappear", and what actually happens is
 * narrower: contributions already carry a name the contributor chose to attach,
 * and those keep showing it. Only the profile page stops resolving. Saying so
 * here is the difference between a setting people trust and one they are afraid
 * to touch.
 */
export function ProfilePrivacySetting({
  initialValue,
  usernameLower,
}: {
  initialValue: boolean;
  /**
   * The claimed handle, or null when none is claimed.
   *
   * A private profile with no username hides a page nobody can reach, so the
   * switch is disabled until one exists rather than accepting a state that does
   * nothing and reading as a setting that has taken effect.
   */
  usernameLower: string | null;
}) {
  const [isPrivate, setIsPrivate] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  const hasUsername = usernameLower !== null;

  async function onCheckedChange(next: boolean) {
    const previous = isPrivate;

    // Optimistic, rolled back on failure. A privacy switch that silently did not
    // save is worse than one that visibly bounced — somebody might otherwise
    // believe a profile is hidden when it is not.
    setIsPrivate(next);
    setIsSaving(true);

    try {
      await updateMyProfile({ isProfilePrivate: next });
      toast.success(
        next ? "Your profile is now private." : "Your profile is now public.",
      );
    } catch (error) {
      setIsPrivate(previous);
      toast.error(
        getApiErrorMessage(error, "Could not change your profile's privacy."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-start gap-3">
      <Switch
        id="profile-private"
        checked={isPrivate}
        onCheckedChange={onCheckedChange}
        disabled={isSaving || !hasUsername}
        className="mt-0.5"
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor="profile-private" className="font-medium">
          Hide my profile
        </Label>
        <p className="text-sm text-muted-foreground">
          {hasUsername ? (
            <>
              Nobody but you can open{" "}
              <span className="font-medium text-foreground">
                /u/{usernameLower}
              </span>
              , and your name stops linking to it. Anything you have already
              shared keeps showing your name, because you chose to share those
              with it — set a resource to anonymous if you want one to carry no
              name at all.
            </>
          ) : (
            <>
              Choose a username first. Until then there is no profile page to
              hide.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
