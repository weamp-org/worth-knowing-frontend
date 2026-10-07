"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

import { HeaderMenu } from "@/components/header-menu";
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
          className="flex shrink-0 items-center gap-2 whitespace-nowrap font-heading text-lg font-normal tracking-wide hover:underline"
        >
          {/*
            Decorative: the wordmark text beside it already names the site, so
            this carries an empty alt rather than repeating "Worth Knowing" to
            a screen reader twice.
          */}
          <Image
            src="/icon-192x192.png"
            alt=""
            width={24}
            height={24}
            className="size-6"
          />
          Worth Knowing
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {/*
            Signed out only. A signed-in header carries the share CTA, the
            disclosure and the avatar — two controls besides the primary — and on
            a phone that is the difference between the wordmark fitting and
            wrapping. Appearance is a preference rather than something you come
            here to do, so it lives in settings alongside the anonymity default
            once you are signed in.
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
              The filled button in the header, and now the only word in it. The
              rest of the signed-in destinations moved behind `HeaderMenu`,
              because a wordmark plus four words inside a `max-w-3xl` container
              left nothing standing out.

              A word rather than an icon on purpose. The share glyphs all carry
              a different meaning — the three-node one is network sharing, the
              arrow out of a box is export — and this button means "submit
              something you found worth knowing".
            */}
            <Button asChild size="sm">
              <Link href="/share">
                <span className="hidden sm:inline">Share something</span>
                <span className="sm:hidden">Share</span>
              </Link>
            </Button>

            {/* Saved, Collections and Settings, in one disclosure. */}
            <HeaderMenu />

            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
