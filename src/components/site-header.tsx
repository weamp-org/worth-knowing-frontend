"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { LibraryIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    // `sticky` rather than `fixed`: it stays in flow and occupies its own
    // space, so nothing downstream needs padding to clear it.
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
        {/* `shrink-0` and `whitespace-nowrap` stop the wordmark being squeezed
            onto two lines when the controls beside it need the room. */}
        <Link
          href="/"
          className="shrink-0 whitespace-nowrap font-heading text-lg font-normal tracking-wide hover:underline"
        >
          Worth Knowing
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {/*
            Signed out only. A signed-in header already carries the gear, the
            share CTA and the avatar, and on a phone that is the difference
            between the wordmark fitting and wrapping. Appearance is a
            preference rather than something you come here to do, so it lives
            in settings alongside the anonymity default once you are signed in.
          */}
          <Show when="signed-out">
            <ThemeToggle />

            {/*
              Clerk renders its own unstyled button by default, which is what
              let these wrap onto two lines on narrow screens. Passing our
              Button as the child gives them the header's sizing and stops the
              wrap.
            */}
            <SignInButton mode="modal">
              <Button size="sm">Sign in</Button>
            </SignInButton>

            {/* Clerk's sign-in modal already offers sign-up, so on mobile one
                button is enough and saves the width the primary CTA needs. */}
            <SignUpButton mode="modal">
              <Button
                size="sm"
                variant="outline"
                className="hidden sm:inline-flex"
              >
                Sign up
              </Button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            {/*
              A gear rather than a word on narrow screens, matching the theme
              toggle beside it. Unlike the share glyphs, a gear has no competing
              meaning, so it survives without a label.
            */}
            {/*
              The gear, not a profile link. It goes to settings, which is where
              a person goes to change something about themselves; the profile is
              a page *about* them, so it is reached from a byline rather than
              from the chrome.
            */}
            <Button asChild size="sm" variant="ghost" className="px-3 sm:px-4">
              <Link href="/settings">
                <SettingsIcon aria-hidden="true" className="sm:hidden" />
                <span className="hidden sm:inline">Settings</span>
                {/* The icon carries no accessible name on its own. */}
                <span className="sr-only sm:hidden">Settings</span>
              </Link>
            </Button>
            {/*
              The filled button in the header, and the only one: sign-in above
              is signed-out only, so the two never compete.

              A word rather than an icon on purpose. The share glyphs all carry
              a different meaning — the three-node one is network sharing, the
              arrow out of a box is export — and this button means "submit
              something you found worth knowing". It also stays a filled button
              the eye can pick out, which an icon-only control loses.
            */}
            <Button asChild size="sm">
              <Link href="/share">
                <span className="hidden sm:inline">Share something</span>
                <span className="sm:hidden">Share</span>
              </Link>
            </Button>
            {/*
              Last, and an icon, because it is the least frequent thing here. The
              gear is a settings page, this is a personal filing system, and the
              share button is the product's own verb — so the order is by how
              often somebody reaches for it, which puts this one at the end.
            */}
            <Button asChild size="sm" variant="ghost" className="px-3 sm:px-4">
              <Link href="/collections">
                <LibraryIcon aria-hidden="true" className="sm:hidden" />
                <span className="hidden sm:inline">Collections</span>
                <span className="sr-only sm:hidden">Collections</span>
              </Link>
            </Button>
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
