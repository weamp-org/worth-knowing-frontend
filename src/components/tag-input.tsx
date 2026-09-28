"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MAX_TAG_LENGTH } from "@/lib/resource-types";

/**
 * Tags as removable chips plus a text box that commits on Enter or comma.
 *
 * Deliberately not a typeahead. The backend has `GET /tags` ready for one, but
 * the tag vocabulary is not the point of a contribution — the resource and the
 * reason are — so this stays plain text until it turns out people need help
 * picking.
 */
export function TagInput({
  id,
  value,
  onChange,
  invalid,
  maxTags,
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  invalid: boolean;
  maxTags: number;
}) {
  const [draft, setDraft] = useState("");

  const isFull = value.length >= maxTags;

  function commit(raw: string) {
    const tag = raw.trim();
    setDraft("");

    if (!tag || isFull) return;

    // Case-insensitive, because the backend folds tags to a slug anyway: "AI"
    // and "ai" would collapse into the same tag, so allowing both would send
    // the contributor to a backend error over a distinction they cannot see.
    const alreadyAdded = value.some(
      (existing) => existing.toLowerCase() === tag.toLowerCase(),
    );

    if (alreadyAdded) return;

    onChange([...value, tag]);
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <ul className="flex flex-wrap items-center gap-2">
          {value.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary" className="gap-1 py-0.5 pr-1 pl-2">
                {tag}
                <button
                  type="button"
                  onClick={() =>
                    onChange(value.filter((other) => other !== tag))
                  }
                  aria-label={`Remove tag ${tag}`}
                  className="p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <XIcon />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <Input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            // Otherwise the first Enter submits the whole form.
            event.preventDefault();
            commit(draft);
            return;
          }

          if (event.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        disabled={isFull}
        maxLength={MAX_TAG_LENGTH}
        aria-invalid={invalid}
        placeholder={
          isFull
            ? `Limit of ${maxTags} tags reached`
            : "Machine Learning, evolution"
        }
      />
    </div>
  );
}
