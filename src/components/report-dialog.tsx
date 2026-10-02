"use client";

import { FlagIcon } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api-error";
import { MAX_REPORT_REASON_LENGTH } from "@/lib/comment-types";

/**
 * Flags something to the moderators.
 *
 * A dialog rather than an inline panel, which is what it replaced for two reasons
 * beyond the obvious one:
 *
 * - **The inline panel moved the thread.** It expanded inside the comment list and
 *   pushed everything below it down, so filing a report lost your reading position.
 * - **A one-line input caps what people write.** Given a single-line box, people write
 *   a single line. The backend has always allowed 500 characters of free text because
 *   a report is a complaint, and the UI was the thing stopping anyone using it.
 *
 * **Nothing changes for any reader afterwards**, including the author. There is no
 * badge, no marker, no state on the reported thing — only the toast. A report is a
 * quiet signal, and showing it would turn that into a scoreboard.
 *
 * Generic over its target because reporting a contribution and reporting a comment are
 * the same act on two different things, and two near-identical components would drift.
 */
export function ReportDialog({
  onReport,
  children,
  what,
  targetTitle,
  body,
}: {
  /** Called with the trimmed reason, or `undefined` when none was given. */
  onReport: (reason?: string) => Promise<void>;
  /** The trigger. Passed in so each caller words its own label. */
  children: ReactNode;
  /** What is being reported, for the title and the sentence. */
  what: string;
  /**
   * Named in the dialog, so the confirmation is about *this* thing rather than about
   * something generic several screens away.
   */
  targetTitle: string;
  /** The reported text, quoted, so the reader can check they picked the right one. */
  body: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isPending) return;

    setIsPending(true);

    try {
      await onReport(reason.trim() || undefined);

      setIsOpen(false);
      setReason("");
      toast.success("Reported to the moderators.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Could not report that ${what}.`));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        {/* A form rather than a button, so Enter submits it and the reason field is a
            real labelled input rather than a div that happens to look like one. */}
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Report this {what}?</DialogTitle>
            <DialogDescription>
              A moderator will look at it. Nothing here changes for anyone else,
              including whoever wrote it.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {/* What is being reported, quoted. Reporting the wrong thing is otherwise
                silent and unrecoverable. */}
            <blockquote className="max-h-40 overflow-y-auto border-l-2 border-border pl-3 text-sm text-muted-foreground">
              {targetTitle}
              {body ? ` — ${body}` : ""}
            </blockquote>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`report-reason-${what}`}>
                Why should this be removed? (optional)
              </Label>
              <Textarea
                id={`report-reason-${what}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={MAX_REPORT_REASON_LENGTH}
                rows={4}
                autoFocus
                placeholder="Optional, but it helps a lot."
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending…" : "Send report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The trigger every report control uses. */
export function ReportTrigger({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-muted-foreground"
      onClick={onClick}
    >
      <FlagIcon aria-hidden="true" />
      Report
    </Button>
  );
}
