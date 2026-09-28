"use client";

import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * Per-resource anonymity, defaulting to the contributor's standing preference.
 *
 * The toggle is always shown rather than hidden behind an "ask me" mode: the
 * point is that the contributor decides at the moment of sharing, and a
 * hidden toggle makes that impossible to override in either direction.
 *
 * Deliberately uncontrolled — the form is the source of truth, and the
 * preference is only read once to choose the initial value.
 */
export function AnonymityToggle({
  defaultAnonymous,
  id,
}: {
  defaultAnonymous: boolean;
  id: string;
}) {
  const { control } = useFormContext();
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
