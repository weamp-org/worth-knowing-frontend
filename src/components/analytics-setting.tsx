"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { hasAnalyticsOptOut, setAnalyticsOptOut } from "@/lib/analytics";

/**
 * The analytics preference: on by default, off when the reader says so.
 *
 * Same shape as the other settings on this page — a switch that saves on
 * change. The initial state is read from the browser on mount, because only
 * the browser knows the stored opt-out; until then the switch stays disabled
 * rather than showing a value that might be wrong.
 *
 * Opting out stops future collection. Events already sent remain, and can be
 * removed on request — the copy says so rather than implying otherwise.
 */
export function AnalyticsSetting() {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    setIsEnabled(!hasAnalyticsOptOut());
  }, []);

  async function onCheckedChange(next: boolean) {
    setAnalyticsOptOut(!next);
    setIsEnabled(next);
    toast.success(
      next ? "Usage analytics turned on." : "Usage analytics turned off.",
    );
  }

  return (
    <div className="flex items-start gap-3">
      <Switch
        id="usage-analytics"
        checked={isEnabled ?? false}
        onCheckedChange={onCheckedChange}
        disabled={isEnabled === null}
        className="mt-0.5"
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor="usage-analytics" className="font-medium">
          Usage analytics
        </Label>
        <p className="text-sm text-muted-foreground">
          Helps improve how resources get discovered: which pages are visited,
          which surfaces lead to a resource, and how often resources are opened,
          saved, collected, discussed, or shared. Never post text, titles,
          links, names, or profiles — only which surfaces get used. Turning this
          off stops future collection.
        </p>
      </div>
    </div>
  );
}
