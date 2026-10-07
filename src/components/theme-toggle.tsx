"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Flips between light and dark. Settings has the three-way control.
 *
 * Split this way on purpose: a header control should do one obvious thing, and
 * "system" is a preference you set once rather than toggle. Clicking here writes
 * an explicit light or dark, which does mean the header alone cannot get back
 * to following the device — that is what settings is for, and it is now a
 * visible control rather than a hidden reset.
 *
 * The glyphs are driven by the `dark` class on `<html>` rather than by
 * `resolvedTheme`, because `resolvedTheme` is undefined until next-themes has
 * read localStorage and rendering from it would disagree with the server. The
 * class is already resolved on both sides, so there is nothing to mismatch, and
 * the icon always shows what is actually on screen.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const next = isDark ? "light" : "dark";

  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(next)}>
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
      {/* Named only once mounted, so the label is never absent for assistive
          tech and never disagrees with the server's empty first render. */}
      <span className="sr-only">
        {isMounted ? `Switch to ${next} theme` : "Change theme"}
      </span>
    </Button>
  );
}
