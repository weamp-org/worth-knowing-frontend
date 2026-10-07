"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const OPTIONS = [
  { value: "system", label: "System", Icon: MonitorIcon },
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
] as const;

/**
 * The full theme preference, as a three-way choice.
 *
 * A binary toggle cannot express this. The header control used to flip between
 * light and dark using `resolvedTheme` — the theme actually in effect, not the
 * stored preference — so once a user clicked it the app held an explicit
 * preference and "system" became unreachable from the header. This sets the
 * preference directly, and it is the only way back to following the device.
 *
 * Laid out as a column with the group on its own full-width row, and the
 * labels dropped below `sm`. Three labelled pills are roughly 380px at the
 * toggle's default padding, against about 290px of content width on a 320px
 * screen, so sitting beside the description they overflowed. Icons alone fit
 * at any width, and an `sr-only` span keeps the accessible name on mobile.
 */
export function ThemeSetting() {
  const { theme, setTheme } = useTheme();

  // `theme` comes from localStorage, so the server has no idea what it is. The
  // group is held empty until after hydration rather than rendered with the
  // real value, because a Radix ToggleGroup stamps `data-state` and
  // `aria-checked` onto each item: rendering the stored value immediately
  // hydrates every item as `on` where the server sent `off`, and
  // `suppressHydrationWarning` on the wrapper does not reach descendants.
  // Applying the value in an effect means the first client render matches the
  // server exactly, and the selection appears a tick later.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  return (
    <div className="flex flex-col gap-2">
      <Label className="font-medium">Appearance</Label>

      <ToggleGroup
        type="single"
        value={isMounted ? (theme ?? "") : ""}
        onValueChange={(value) => {
          // A deselect is a no-op: the group is single-select, but clicking
          // the active item would otherwise set the value to "".
          if (value) setTheme(value);
        }}
        variant="outline"
        size="sm"
        className="w-full justify-start sm:w-auto"
      >
        {OPTIONS.map(({ value, label, Icon }) => (
          <ToggleGroupItem
            key={value}
            value={value}
            className="flex-1 gap-1.5 px-2 sm:flex-none sm:px-4"
          >
            <Icon />
            <span className="hidden sm:inline">{label}</span>
            <span className="sr-only sm:hidden">{label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <p className="text-sm text-muted-foreground">
        System follows your device&apos;s setting and changes with it.
      </p>
    </div>
  );
}
