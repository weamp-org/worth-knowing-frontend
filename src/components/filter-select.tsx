"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * One labelled filter dropdown.
 *
 * `/browse` renders the same three filters twice — inline on desktop, in a sheet
 * on mobile — and this is the control both use. Extracted because the parts worth
 * sharing are the ones that are easy to get subtly wrong: the label wiring, and
 * the fact that a Radix `Select` needs a non-empty `value`, which is why every
 * option list starts with a real "any" entry rather than relying on the
 * placeholder.
 *
 * The option lists come from `@/lib/browse`, so what the two layouts offer cannot
 * drift apart. Only the width and the change handler differ between them.
 */
export function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
  className,
}: {
  /** Unique per rendered control — both layouts are in the DOM at once. */
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  /** Receives the raw option value, sentinels included. Map it with `chosen`. */
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
