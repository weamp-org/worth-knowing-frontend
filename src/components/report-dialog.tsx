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
import { MAX_REPORT_DETAIL_LENGTH } from "@/lib/comment-types";

/**
 * Flags something to the moderators.
 *
 * A dialog rather than an inline panel, which is what it replaced for two reasons
 * beyond the obvious one:
 *
 * - **The inline panel moved the thread.** It expanded inside the comment list and
 *   pushed everything below it down, so filing a report lost your reading position.
 * - **A one-line input caps what people write.** Given a single-line box, people write
 *   a single line. The detail field is deliberately a textarea for that reason alone.
 *
 * **A category is required and the detail is optional**, which is the whole design. A
 * queue of free text has to be read one report at a time before a moderator can group
 * anything; with categories it reads as "12 spam, 3 broken links". The optional detail
 * keeps the case free-text-only protected: somebody who knows exactly what is wrong
 * picks the nearest fit and adds a sentence if they want to.
 *
 * **Nothing about the wording assumes removal.** It was "why should this be removed?",
 * which is wrong for a category like `BROKEN_LINK` where the honest outcome is a fix —
 * and since no report is ever shown to anyone but a moderator, that wording was quietly
 * implying a consequence the product does not promise. The dialog now says plainly
 * that not everything reported gets removed.
 *
 * **Nothing changes for any reader afterwards**, including the author. No badge, no
 * marker, no state on the reported thing — only the toast.
 *
 * Generic over its target because reporting a contribution and reporting a comment are
 * the same act on two different things, and two near-identical components would drift.
 */
export function ReportDialog<R extends string>({
  onReport,
  reasons,
  labels,
  children,
  what,
  targetTitle,
  body,
}: {
  /** Called with the chosen category and the trimmed detail, if any. */
  onReport: (reason: R, detail?: string) => Promise<void>;
  /** The categories to offer, most likely first. */
  reasons: readonly R[];
  /** How each category reads to the person choosing it. */
  labels: Record<R, string>;
  /** The trigger. Passed in so each caller words its own label. */
  children: ReactNode;
  /** What is being reported, for the title and the sentences. */
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
  // Unset rather than defaulted to the first category: silently filing a report as
  // "spam" because that happened to be first in the list is worse than one extra
  // deliberate click.
  const [reason, setReason] = useState<R | null>(null);
  const [detail, setDetail] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isPending || reason === null) return;

    setIsPending(true);

    try {
      await onReport(reason, detail.trim() || undefined);

      setIsOpen(false);
      setReason(null);
      setDetail("");
      toast.success("Reported to the moderators.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Could not report that ${what}.`));
    } finally {
      setIsPending(false);
    }
  }

  // Radix unmounts the content when closed, but the state lives here so reopening a
  // dialog for a different comment does not carry the last one's category over.
  const groupId = `report-reason-${what}`;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        setIsOpen(next);
        if (!next) {
          setReason(null);
          setDetail("");
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        {/* A form rather than a button, so Enter submits and the fields are real
            inputs inside a real form. */}
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Report this {what}?</DialogTitle>
            <DialogDescription>
              A moderator will look at it. Nothing here changes for anyone else,
              including whoever wrote it — and not everything reported gets
              removed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {/* What is being reported, quoted. Reporting the wrong thing is otherwise
                silent and unrecoverable. */}
            <blockquote className="max-h-40 overflow-y-auto border-l-2 border-border pl-3 text-sm text-muted-foreground">
              {targetTitle}
              {body ? ` — ${body}` : ""}
            </blockquote>

            {/* A radio group rather than a select: with four or five options the point
                is partly that you can *see* that one of them fits, and a dropdown
                hides the list until it is already open. It also makes
                "something else" visibly the last resort rather than the default. */}
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">
                What&apos;s wrong?{" "}
                <span className="text-muted-foreground">(required)</span>
              </legend>

              {reasons.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm has-checked:border-foreground has-checked:bg-muted/40"
                >
                  <input
                    type="radio"
                    name={groupId}
                    value={option}
                    checked={reason === option}
                    onChange={() => setReason(option)}
                    className="accent-foreground"
                  />
                  {labels[option]}
                </label>
              ))}
            </fieldset>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`${groupId}-detail`}>
                Anything else a moderator should know? (optional)
              </Label>
              <Textarea
                id={`${groupId}-detail`}
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                maxLength={MAX_REPORT_DETAIL_LENGTH}
                rows={3}
                placeholder="Optional, but it often helps."
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            {/* Disabled until a category is chosen, which is the required half. The
                detail is genuinely optional — the button enables without it. */}
            <Button type="submit" disabled={isPending || reason === null}>
              {isPending ? "Sending…" : "Send report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The trigger every report control uses. */
export function ReportTrigger() {
  return (
    <Button size="sm" variant="ghost" className="text-muted-foreground">
      <FlagIcon aria-hidden="true" />
      Report
    </Button>
  );
}
