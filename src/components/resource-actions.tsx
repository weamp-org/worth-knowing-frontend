"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ReportDialog, ReportTrigger } from "@/components/report-dialog";
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
import {
  RESOURCE_REASON_LABELS,
  RESOURCE_REPORT_REASONS,
} from "@/lib/comment-types";
import {
  deleteResource,
  isMyResource,
  reportResource,
} from "@/lib/resources-api";

/**
 * The actions a reader gets on a resource: the contributor's Edit and Remove, or a
 * Report control for anybody else.
 *
 * Shown only once the backend confirms who they are. The detail page is
 * server-rendered, and a resource shared anonymously comes back with its contributor
 * withheld — so the page cannot tell from the payload whether it owns it. Asking
 * costs one small authenticated call, and until it answers nothing renders, so a
 * delete button never flashes on someone else's post.
 *
 * One probe serves both branches on purpose. A separate report component would need
 * the same ownership question answered a second time, and two round trips to ask one
 * thing is the kind of duplication that later reads as two sources of truth.
 *
 * There is no "remove my name" action. Anonymity already does that *and* leaves
 * the resource editable, so detaching the contributor would only take away the
 * author's ability to fix a typo. The dialog says so, which is why the middle
 * path does not need a button of its own.
 *
 * Report is the *other* branch rather than a fourth button. The backend refuses a
 * report on your own contribution, so offering one would be offering something that
 * cannot succeed — and if somebody does agree with a report about their own post,
 * `Remove` is the correct and much stronger answer.
 */
export function ResourceActions({
  resourceId,
  title,
  why,
}: {
  resourceId: string;
  /** Named in the dialog, so the confirmation is about this resource. */
  title: string;
  /** Quoted in the report dialog, so nobody flags the wrong post by accident. */
  why: string;
}) {
  const router = useRouter();
  const [isMine, setIsMine] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // A signed-out reader gets a 401 here, which is expected rather than an
    // error worth surfacing — it just means there is nothing to show. Reporting needs
    // a session anyway, so a signed-out reader is given nothing rather than a
    // control that would 401.
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

  if (!isMine) {
    return (
      <ReportDialog
        body={why}
        labels={RESOURCE_REASON_LABELS}
        onReport={(reason, detail) =>
          reportResource(resourceId, reason, detail)
        }
        reasons={RESOURCE_REPORT_REASONS}
        targetTitle={title}
        what="contribution"
      >
        <ReportTrigger />
      </ReportDialog>
    );
  }

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
