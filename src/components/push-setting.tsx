"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  getPushPublicKey,
  subscribePush,
  unsubscribePush,
} from "@/lib/notifications-api";

/**
 * The caller's push preference.
 *
 * Opt-in, flipped here and nowhere else: no auto-prompting after sign-in, no
 * banner. A push permission asked for before its value is understood reads as
 * a growth prompt, and denied-once means the browser stops asking — so the
 * toggle explains first and asks only when flipped on.
 *
 * Three states, not two: supported-and-off, on, and unavailable (no PushManager
 * in the browser, permission denied, or push disabled server-side). The
 * unavailable states disable the switch with the reason beside it rather than
 * hiding the setting — a missing toggle reads as a missing feature, and the
 * reader deserves to know which wall they hit.
 */
type PushState = "checking" | "on" | "off" | "unavailable";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }

  return output;
}

function serialize(subscription: PushSubscription): {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  const json = subscription.toJSON();

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
  };
}

export function PushSetting() {
  const [state, setState] = useState<PushState>("checking");
  const [unavailableReason, setUnavailableReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Reconciles on mount: an existing browser subscription means on, and it is
  // re-sent (idempotent upsert) so a server-side prune cannot desync the two
  // halves without the toggle noticing. `syncFromBrowser` only closes over
  // stable setters and React Compiler memoizes it, so it is deliberately not
  // listed: listing it would re-run this mount effect wherever it is not
  // memoized.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only effect, see above
  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setState("unavailable");
      setUnavailableReason("This browser does not support push notifications.");
      return;
    }

    if (Notification.permission === "denied") {
      setState("unavailable");
      setUnavailableReason(
        "Notifications are blocked for this site in your browser settings.",
      );
      return;
    }

    void syncFromBrowser();
  }, []);

  /**
   * Reads the true state from the browser and reflects it.
   *
   * Used on mount and to settle the toggle after a failed write — the switch
   * must show what is, not what was asked for. A failed re-send on mount is
   * swallowed: the toggle already reflects the browser half.
   */
  async function syncFromBrowser(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setState("off");
        return;
      }

      setState("on");
      await subscribePush(serialize(subscription));
    } catch {
      setState("unavailable");
      setUnavailableReason("Could not reach the push service.");
    }
  }

  async function enable(): Promise<void> {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      setState("unavailable");
      setUnavailableReason(
        "Notifications are blocked for this site in your browser settings.",
      );
      return;
    }

    const publicKey = await getPushPublicKey();

    if (!publicKey) {
      setState("unavailable");
      setUnavailableReason("Push is not enabled on the server right now.");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await subscribePush(serialize(subscription));
    setState("on");
    toast.success("Push notifications are on for this browser.");
  }

  async function disable(): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // The browser half first: if the server call below fails, the toggle
      // rolls back and the subscription is already gone locally, which is the
      // safer half to be wrong on.
      await subscription.unsubscribe();
      await unsubscribePush(subscription.endpoint);
    }

    setState("off");
    toast.success("Push notifications are off for this browser.");
  }

  async function onCheckedChange(next: boolean) {
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (next) await enable();
      else await disable();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not change that setting."));
      // Settle on what is, not what was asked for: a failed disable may have
      // removed the browser half before the server call failed.
      await syncFromBrowser();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-start gap-3">
      <Switch
        id="push-notifications"
        checked={state === "on"}
        onCheckedChange={onCheckedChange}
        disabled={state !== "on" && state !== "off"}
        className="mt-0.5"
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor="push-notifications" className="font-medium">
          Push notifications for this browser
        </Label>
        <p className="text-sm text-muted-foreground">
          {state === "unavailable" ? (
            unavailableReason
          ) : (
            <>
              Get a notification here even when Worth Knowing is closed. One
              browser at a time — turning it on elsewhere does not turn it off
              here.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
