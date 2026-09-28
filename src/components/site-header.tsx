"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    // `sticky` rather than `fixed`: it stays in flow and occupies its own
    // space, so nothing downstream needs padding to clear it.
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-4 px-4">
        {/* The wordmark is the only link to `/`. A separate "Home" nav item
            would duplicate it. */}
        <Link
          href="/"
          className="font-heading text-lg font-normal tracking-wide hover:underline"
        >
          Worth Knowing
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Show when="signed-out">
            <SignInButton />
            <SignUpButton />
          </Show>
          <Show when="signed-in">
            <Button asChild size="sm" variant="outline">
              <Link href="/share">Share something</Link>
            </Button>
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
