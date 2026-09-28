"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getApiErrorMessage } from "@/lib/api-error";
import { updateMySettings } from "@/lib/settings-api";

/**
 * The caller's standing anonymity preference.
 *
 * Saved on change rather than behind a submit button: there is one setting, and
 * an explicit save on a single toggle makes people assume it is not already
 * saved. The checkbox disables while the request is in flight so a double
 * toggle cannot race.
 */
export function AnonymitySetting({ initialValue }: { initialValue: boolean }) {
  const [isAnonymous, setIsAnonymous] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  async function onCheckedChange(next: boolean) {
    const previous = isAnonymous;

    // Optimistic, so the switch responds immediately. Rolled back if the write
    // fails, because a setting that silently did not save is worse than one
    // that visibly bounced.
    setIsAnonymous(next);
    setIsSaving(true);

    try {
      await updateMySettings({ anonymousByDefault: next });
      toast.success(
        next
          ? "New contributions will be shared anonymously."
          : "New contributions will show your name.",
      );
    } catch (error) {
      setIsAnonymous(previous);
      toast.error(getApiErrorMessage(error, "Could not save that preference."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-start gap-3">
      <Switch
        id="anonymous-by-default"
        checked={isAnonymous}
        onCheckedChange={onCheckedChange}
        disabled={isSaving}
        className="mt-0.5"
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor="anonymous-by-default" className="font-medium">
          Share new contributions anonymously
        </Label>
        <p className="text-sm text-muted-foreground">
          Sets the default for anything you share from now on. You can override
          it on each one. Changing this never alters what you have already
          shared.
        </p>
      </div>
    </div>
  );
}
