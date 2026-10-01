"use client";

import {
  BookmarkIcon,
  LibraryIcon,
  MenuIcon,
  SettingsIcon,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The signed-in header's secondary destinations, behind one button.
 *
 * These three used to sit in the header as their own ghost buttons, which is
 * what made it noisy: a wordmark plus four words inside a `max-w-3xl` container,
 * four of them similar-length and similarly quiet, so nothing stood out as the
 * thing to do. `Share something` now stands alone as the only filled control,
 * which is the point of it being there.
 *
 * A real `DropdownMenu` rather than a hand-rolled panel, because a disclosure
 * that opens a list of links owes the keyboard outside-click-to-close, Escape,
 * focus handling and arrow-key navigation. `CollectionPicker` gets away with a
 * plain absolutely-positioned `<div>` because it opens a single row of toggles and
 * is not a navigation surface.
 *
 * Ordered by how often each is reached for, with Settings last and separated —
 * it is configuration rather than somewhere you go to look at something.
 */
export function HeaderMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="px-2">
          <MenuIcon aria-hidden="true" />
          {/* The glyph carries no accessible name on its own. */}
          <span className="sr-only">Menu</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href="/saved">
            <BookmarkIcon aria-hidden="true" />
            Saved
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/collections">
            <LibraryIcon aria-hidden="true" />
            Collections
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
