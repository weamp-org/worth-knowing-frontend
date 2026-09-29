"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
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
import { deleteCollection } from "@/lib/collections-api";

/**
 * The two actions an owner gets on their own collection: Edit, and Remove.
 *
 * Unlike `ResourceOwnerActions` there is no ownership probe first. `isOwner` is
 * on the collection response, decided by the backend, so the server component
 * that rendered this page already knows — one fewer request than the resource
 * page spends, and no flash of a control that might not belong to you.
 *
 * The dialog says what deletion does and, more importantly, what it does not:
 * the resources inside stay on the site with their own authors' names. Somebody
 * who thinks deleting a collection deletes the resources in it would be right to
 * hesitate, and they should not have to guess.
 */
export function CollectionOwnerActions({
  collectionId,
  title,
}: {
  collectionId: string;
  /** Named in the dialog, so the confirmation is about this collection. */
  title: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function onDelete(event: React.MouseEvent) {
    // Radix closes the dialog when the action is pressed. Suppressing that keeps
    // it open for the length of the request, so a failure is retryable rather
    // than something the owner has to re-open the dialog to discover.
    event.preventDefault();

    if (isDeleting) return;

    setIsDeleting(true);

    try {
      await deleteCollection(collectionId);
      setIsOpen(false);
      toast.success("Collection deleted.");
      // No `router.refresh()`: the collection routes are `force-dynamic`, so
      // navigating renders them fresh.
      router.push("/collections");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Could not delete that collection."),
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="ml-auto flex items-center gap-1">
      <Button asChild variant="ghost">
        <Link href={`/collections/${collectionId}/edit`}>
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
            <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{title}</span> will
              be gone. This cannot be undone.
              <br />
              <br />
              The resources inside it are not deleted — they stay on Worth
              Knowing with the names of the people who shared them. Only your
              arrangement of them goes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={onDelete}
            >
              {isDeleting ? "Deleting…" : "Delete collection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
