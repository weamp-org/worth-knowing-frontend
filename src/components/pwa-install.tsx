"use client";

import { DownloadIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

/**
 * Minimal `beforeinstallprompt` shape. Not in `lib.dom`, so declared here
 * rather than widened globally — the only consumer is this component.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** True when already launched as the installed app, on either platform. */
function isRunningStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari reports home-screen launches this way.
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true
  );
}

/** iOS never fires `beforeinstallprompt`, so it gets instructions instead. */
function isIOS(): boolean {
  if (/iPad|iPhone|iPod/.test(window.navigator.userAgent)) return true;
  // iPadOS 13+ reports as desktop Mac with touch.
  return (
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1
  );
}

/**
 * Shared install state: the deferred Chromium prompt, or the iOS hint flag.
 *
 * One hook serving both placements (footer text, menu row) so the
 * `beforeinstallprompt` listener is never duplicated — a second
 * `preventDefault()` listener is a second chance to lose the event.
 */
function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (isRunningStandalone()) return;

    if (isIOS()) {
      setShowIOSHint(true);
      return;
    }

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      // The event is single-use; the browser re-fires it on a later visit
      // if the user dismisses.
      setDeferred(null);
    }
  }

  return { deferred, showIOSHint, install };
}

/**
 * Secondary install affordance for the footer.
 *
 * Chromium: holds the deferred `beforeinstallprompt` and renders an
 * `Install app` text button only while installation is actually available.
 * iOS: renders a one-line Share → Add to Home Screen hint when not
 * installed. Everywhere else — already standalone, or no install path —
 * renders nothing. No banner, no persistence, no caching changes.
 */
export function PwaInstall() {
  const { deferred, showIOSHint, install } = usePwaInstall();

  if (deferred) {
    return (
      <button
        type="button"
        onClick={install}
        className="self-start hover:text-foreground"
      >
        Install app
      </button>
    );
  }

  if (showIOSHint) {
    return (
      <p className="text-xs">To install: open Share → Add to Home Screen.</p>
    );
  }

  return null;
}

/**
 * Install row for the header menu.
 *
 * Same state as {@link PwaInstall}, rendered as a native menu item so it
 * sits alongside Saved and Collections rather than buried in the footer.
 * The iOS hint is plain muted text, not an item — there is nothing to
 * invoke, and a disabled row would read as "not allowed".
 */
export function PwaInstallMenuItem() {
  const { deferred, showIOSHint, install } = usePwaInstall();

  if (deferred) {
    return (
      <DropdownMenuItem
        onSelect={() => {
          void install();
        }}
      >
        <DownloadIcon aria-hidden="true" />
        Install app
      </DropdownMenuItem>
    );
  }

  if (showIOSHint) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground normal-case">
        To install: open Share → Add to Home Screen.
      </p>
    );
  }

  return null;
}
