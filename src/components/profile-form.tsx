"use client";

import { useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api-error";
import { updateMyProfile } from "@/lib/profile-api";
import {
  type ProfileFormValues,
  profileFormSchema,
} from "@/lib/profile-form-schema";
import { MAX_BIO_LENGTH, type Profile } from "@/lib/resource-types";
import {
  normalizeUsername,
  suggestUsername,
  USERNAME_MAX_LENGTH,
} from "@/lib/username";

/**
 * Edit the fields this application owns: username, and bio.
 *
 * Display name and avatar are deliberately absent. Both belong to Clerk, and
 * `AccountDetails` is where they are edited — sending either through this form
 * would be rejected by the backend's `forbidNonWhitelisted` pipe with a 400,
 * which is the correct outcome but a confusing one to trigger.
 *
 * **A username cannot be released, only changed.** The backend has no path that
 * sets `usernameLower` back to null: `UpdateMyProfileDto` requires 3 characters,
 * and `applyClaim` only ever grants. So an empty username field is read as
 * "unchanged" rather than "clear it" — the same empty string means the opposite
 * thing in the bio field, and that asymmetry is deliberate and explained in the
 * field's hint.
 *
 * The save button is enabled only when something would actually be sent, using
 * the same comparison as the submit handler. Deriving them separately is how a
 * button ends up enabled for a change that is then dropped.
 *
 * The caller must key this on the stored username — see `/settings/profile`. A
 * rename has to remount the form for the button to return to its disabled state.
 */
/**
 * The values the form starts from, and the only things a save would overwrite.
 *
 * `username` is the stored *display* form, not the normalized one, so retyping a
 * handle in different case is correctly seen as a change — the backend would
 * re-grant it and the displayed name really would change.
 */
function initialValues(profile: Profile) {
  return { username: profile.username ?? "", bio: profile.bio ?? "" };
}

/**
 * Whether a username edit would be sent.
 *
 * False for an empty value, because a username cannot be released. Kept as one
 * function so the button's enabled state and the submit handler cannot disagree
 * about what counts as a change — the failure mode is a button that enables for
 * an edit that is then silently dropped, which is exactly the bug that made
 * clearing the field look like it did something.
 */
function isUsernameEdit(value: string, initial: string): boolean {
  const trimmed = value.trim();

  return trimmed.length > 0 && trimmed !== initial;
}

/**
 * Whether saving would surrender a handle, as opposed to re-styling it.
 *
 * The distinction from {@link isUsernameEdit} is the whole reason this is a
 * separate function. A handle is *not* given up when only its display case
 * changes — `AdaL` retyped as `adal` is the same identity, and `applyClaim`
 * skips the release when the normalized values match. The dialog has to warn
 * about the one that is genuinely irreversible, so a cosmetic edit must not
 * trigger it: a warning that cries wolf on a case change is one people learn to
 * click through, which defeats it for the real thing.
 */
function isSurrenderingHandle(
  value: string,
  currentLower: string | null,
): boolean {
  if (currentLower === null) return false;

  const trimmed = value.trim();

  return trimmed.length > 0 && normalizeUsername(trimmed) !== currentLower;
}

/** The fields a save would send. `undefined` means "leave this alone". */
type ProfilePatch = { username?: string; bio?: string };

export function ProfileForm({
  profile,
  redirectTo,
}: {
  profile: Profile;
  /**
   * Where to go after a successful save, instead of refreshing in place.
   *
   * The share page sends somebody here with `?next=/share` so claiming a
   * username returns them to the form they were trying to fill in, rather than
   * to a settings page with nothing left to do.
   *
   * Already validated by the caller — this is a server component, and it checks
   * the value is a same-origin path before passing it. A `router.push` target
   * built from a raw query parameter is an open redirect, so the check lives
   * there and not here.
   */
  redirectTo?: string;
}) {
  const router = useRouter();
  const initial = initialValues(profile);
  const { user, isLoaded } = useUser();

  // A starting point, shown as a placeholder and never prefilled. Prefilling
  // would put a value in the field that saves without being chosen, and a
  // suggestion is unverified — if it is taken, the person would hit a 409 for a
  // handle they never picked.
  const suggestion =
    profile.username || !isLoaded
      ? null
      : suggestUsername({
          name: user?.fullName,
          email: user?.primaryEmailAddress?.emailAddress,
        });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: "onTouched",
    defaultValues: initial,
  });

  // A save that is waiting on the contributor's confirmation. Held rather than
  // sent, so cancelling the dialog leaves the form exactly as it was — including
  // what they typed, which they have not lost by changing their mind.
  const [pending, setPending] = useState<ProfilePatch | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const username = form.watch("username") ?? "";
  const bio = form.watch("bio") ?? "";

  // Same two tests as `onSubmit`, so what the button promises is what the save
  // does. No `useMemo`: React Compiler is enabled, and this is two comparisons.
  const isDirty =
    isUsernameEdit(username, initial.username) || bio !== initial.bio;

  async function save(patch: ProfilePatch) {
    setIsSaving(true);

    try {
      await updateMyProfile(patch);
      setPending(null);
      // Confirmed in both paths. Navigating is not itself an acknowledgement
      // that the save worked, and finding out otherwise on the next page is a
      // worse way to learn it than being told.
      toast.success("Profile saved.");

      if (redirectTo) {
        // A push re-renders the destination, which reads the profile afresh, so
        // no refresh is needed. Deliberately not `push` *and* `refresh`: that
        // would fetch this page again on the way out for no benefit.
        router.push(redirectTo);
        return;
      }

      // The header and every byline that links here read the profile, and the
      // feed is `force-dynamic` but this page's own header is not remounted by
      // a toast — so a refresh is what actually propagates a new handle.
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not save your profile."));
    } finally {
      setIsSaving(false);
    }
  }

  function onSubmit(values: ProfileFormValues) {
    // Only send what changed. An empty username means "unchanged"; an empty bio
    // means "clear it" — two different meanings for the same empty string,
    // resolved here rather than guessed at by the caller.
    const patch: ProfilePatch = {};

    if (isUsernameEdit(values.username, initial.username)) {
      patch.username = values.username.trim();
    }

    if (values.bio !== initial.bio) {
      patch.bio = values.bio;
    }

    // Unreachable by clicking, since the button is disabled when nothing is
    // dirty. Enter still submits a form whose submit button is disabled in some
    // browsers, so the guard stays — silently, because a disabled button already
    // said there was nothing to do and a toast here would be noise.
    if (Object.keys(patch).length === 0) return;

    // Ask before the one irreversible thing, and only for that. A bio-only save
    // goes straight through, because a dialog on every keystroke-adjacent action
    // is how people learn to click through dialogs.
    if (isSurrenderingHandle(values.username, profile.usernameLower)) {
      setPending(patch);
      return;
    }

    void save(patch);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={USERNAME_MAX_LENGTH}
            placeholder={suggestion ?? "your-handle"}
            aria-describedby="username-hint"
            {...form.register("username")}
          />
          <FieldDescription id="username-hint">
            {username.trim().length > 0 ? (
              <>
                Your profile will be at{" "}
                <span className="font-medium text-foreground">
                  /u/{normalizeUsername(username)}
                </span>
                {isSurrenderingHandle(username, profile.usernameLower)
                  ? `, and ${profile.usernameLower} is given up for good.`
                  : "."}
              </>
            ) : initial.username.length > 0 ? (
              // Cleared, but a handle is held. There is no way to release one, so
              // say that rather than letting an emptied field read as "remove".
              <>
                Your username cannot be removed, only changed.{" "}
                <span className="font-medium text-foreground">
                  /u/{profile.usernameLower}
                </span>{" "}
                stays yours until you pick a new one.
              </>
            ) : (
              "This becomes your profile address. Lowercase letters, numbers and underscores."
            )}
            {suggestion && username.trim().length === 0 ? (
              <>
                {" "}
                <span className="text-foreground">{suggestion}</span> is a
                suggestion — type it or pick your own.
              </>
            ) : null}
          </FieldDescription>
          <FieldError>{form.formState.errors.username?.message}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="bio">Bio</FieldLabel>
          <Textarea
            id="bio"
            rows={3}
            maxLength={MAX_BIO_LENGTH}
            placeholder="A line about what you find worth knowing."
            aria-describedby="bio-hint"
            {...form.register("bio")}
          />
          <FieldDescription id="bio-hint">
            Optional. Shown on your profile only.
          </FieldDescription>
          <FieldError>{form.formState.errors.bio?.message}</FieldError>
        </Field>
      </FieldGroup>

      <div>
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || isSaving || !isDirty}
        >
          {form.formState.isSubmitting || isSaving ? "Saving…" : "Save profile"}
        </Button>
      </div>

      {/*
        The one irreversible action in settings, so it asks first.

        Same shape as the delete-resource dialog, and for the same reason: this
        cannot be undone by any path in the product, and the person losing
        something needs to be told which thing it is rather than discovering it
        later. Both handles are named, because "your old username" is not
        actionable and `/u/adal` is.

        Cancel keeps the pending patch rather than discarding it, so changing
        your mind does not clear what somebody typed.
      */}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          // Suppressed while the save is in flight: closing the dialog mid-request
          // would leave the outcome unannounced.
          if (!open && !isSaving) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Give up this username?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                /u/{profile.usernameLower}
              </span>{" "}
              will be released the moment you save. Nobody can claim it after
              that — not anyone else, and not you. Your profile moves to{" "}
              <span className="font-medium text-foreground">
                /u/
                {pending?.username ? normalizeUsername(pending.username) : ""}
              </span>
              , and any link to the old address will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={(event) => {
                // Radix closes on press. Suppressed so the dialog stays open for
                // the request, and a failure is retryable rather than something
                // to re-open the dialog to discover.
                event.preventDefault();

                if (pending) void save(pending);
              }}
            >
              {isSaving ? "Saving…" : "Change username"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
