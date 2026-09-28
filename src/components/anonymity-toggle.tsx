"use client";

import { useEffect, useState } from "react";
import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ResourceFormValues } from "@/lib/resource-form-schema";

/**
 * Per-resource anonymity, defaulting to the contributor's standing preference.
 *
 * The toggle is always shown rather than hidden behind an "ask me" mode: the
 * point is that the contributor decides at the moment of sharing, and a
 * hidden toggle makes that impossible to override in either direction.
 *
 * Takes `control` as a prop rather than calling `useFormContext`, because the
 * form has no `FormProvider` around it — every field in `ShareResourceForm`
 * passes `control` to its `Controller` directly, and reaching for context here
 * would be the one place assuming a provider that does not exist. It reads as
 * a null context at runtime rather than a type error, so it only shows up in a
 * browser.
 */
export function AnonymityToggle({
  control,
  defaultAnonymous,
  id,
}: {
  control: Control<ResourceFormValues>;
  defaultAnonymous: boolean;
  id: string;
}) {
  const [initial, setInitial] = useState(defaultAnonymous);

  // Re-read if the preference arrives after first paint; the form's default
  // value is only read on mount, so the state has to catch up.
  useEffect(() => {
    setInitial(defaultAnonymous);
  }, [defaultAnonymous]);

  return (
    <Controller
      name="isAnonymous"
      control={control}
      render={({ field }) => (
        <div className="flex items-start gap-3">
          <Switch
            id={id}
            checked={field.value}
            onCheckedChange={field.onChange}
            className="mt-0.5"
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor={id} className="font-medium">
              Share anonymously
            </Label>
            <p className="text-sm text-muted-foreground">
              {initial
                ? "Your name is hidden from this one, matching your default. You can change that."
                : "Your name is shown on this one, matching your default. You can change that."}
            </p>
          </div>
        </div>
      )}
    />
  );
}
