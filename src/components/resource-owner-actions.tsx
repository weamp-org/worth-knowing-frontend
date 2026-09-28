"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { deleteResource, isMyResource } from "@/lib/resources-api";

/**
 * The two actions a contributor gets on their own resource: Edit, and Remove.
 *
 * Shown only once the backend confirms the resource is theirs. The detail page is
 * server-rendered, and a resource shared anonymously comes back with its
 * contributor withheld — so the page cannot tell from the payload whether it
 * owns it. Asking costs one small authenticated call, and until it answers
 * nothing renders, so a delete button never flashes on someone else's post.
 *
 * Both live in one component deliberately. Splitting them would mean two
 * identical ownership checks, and one round trip answers the question for both.
 *
 * There is no "remove my name" action. Anonymity already does that *and* leaves
 * the resource editable, so detaching the contributor would only take away the
 * author's ability to fix a typo. The dialog says so, which is why the middle
 * path does not need a button of its own.
 */
export function ResourceOwnerActions({
  resourceId,
  title,
}: {
  resourceId: string;
  /** Named in the dialog, so the confirmation is about this resource. */
  title: string;
}) {
  const router = useRouter();
  const [isMine, setIsMine] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // A signed-out reader gets a 401 here, which is expected rather than an
    // error worth surfacing — it just means there is nothing to show.
    isMyResource(resourceId)
      .then((mine) => {
        if (!cancelled) setIsMine(mine);
      })
      .catch(() => {
        if (!cancelled) setIsMine(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  async function onDelete(event: React.MouseEvent) {
    // Radix closes the dialog when the action is pressed. Suppressing that
    // keeps it open for the length of the request, so a failure is retryable
    // rather than something the contributor has to re-open the dialog to
    // discover. Radix honours `preventDefault` here.
    event.preventDefault();

    if (isDeleting) return;

    setIsDeleting(true);

    try {
      await deleteResource(resourceId);
      setIsOpen(false);
      toast.success("Resource deleted.");
      // No `router.refresh()`: the feed is `force-dynamic`, so navigating to it
      // renders it fresh.
      router.push("/");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not delete that resource."));
      setIsDeleting(false);
    }
  }

  if (!isMine) return null;

  return (
    <div className="ml-auto flex items-center gap-1">
      <Button asChild variant="ghost">
        <Link href={`/resources/${resourceId}/edit`}>
          <PencilIcon />
          Edit
        </Link>
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon />
            Remove
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resource?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{title}</span> and
              the explanation you wrote will be removed for everyone. This
              cannot be undone.
              <br />
              <br />
              If you would rather keep it and just remove your name, close this
              and use{" "}
              <span className="font-medium text-foreground">
                Edit → Share anonymously
              </span>{" "}
              instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={onDelete}
            >
              {isDeleting ? "Deleting…" : "Delete for everyone"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
