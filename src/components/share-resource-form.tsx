"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { AnonymityToggle } from "@/components/anonymity-toggle";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  type ResourceFormValues,
  resourceFormSchema,
} from "@/lib/resource-form-schema";
import {
  MAX_TAGS,
  MAX_TITLE_LENGTH,
  MAX_URL_LENGTH,
  MAX_WHY_LENGTH,
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPES,
  type Resource,
} from "@/lib/resource-types";
import { createResource, updateResource } from "@/lib/resources-api";

/** Ties the submit button in the footer to the form in the body. */
const FORM_ID = "resource-form";

/**
 * Share a resource, or edit one you already shared.
 *
 * One component for both, because the fields and the validation are identical —
 * editing only changes where the default values come from and which endpoint
 * the submit hits.
 *
 * Built from `Controller` plus `Field` rather than the older `FormField`
 * wrappers, per https://ui.shadcn.com/docs/forms/react-hook-form.
 */
export function ShareResourceForm({
  resource,
  anonymousByDefault = false,
}: {
  resource?: Resource;
  /**
   * The caller's standing preference, pre-fetched by the server component.
   * Only sets the initial value — flipping the toggle overrides it for this
   * resource alone.
   */
  anonymousByDefault?: boolean;
}) {
  const router = useRouter();
  const isEditing = resource !== undefined;

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    mode: "onTouched",
    defaultValues: resource
      ? {
          title: resource.title,
          url: resource.url,
          type: resource.type,
          why: resource.why,
          // Slugs are the identity and `name` is the display form as the
          // contributor typed it, so the name is what an edit form shows.
          tags: resource.tags.map((tag) => tag.name),
          // Editing shows what is stored, not what the current default is.
          // Re-prefilling from the preference would silently flip every
          // anonymous post to public the moment the default changed.
          isAnonymous: resource.isAnonymous,
        }
      : {
          title: "",
          url: "",
          type: "OTHER",
          why: "",
          tags: [],
          isAnonymous: anonymousByDefault,
        },
  });

  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ResourceFormValues) {
    try {
      const saved = resource
        ? await updateResource(resource.id, values)
        : await createResource(values);

      toast.success(isEditing ? "Resource updated." : "Thanks for sharing.");

      // No `router.refresh()`: the resource routes are `force-dynamic`, so
      // arriving at the detail page re-fetches it from the backend.
      router.push(`/resources/${saved.id}`);
    } catch (error) {
      form.setError("root", {
        type: "server",
        message: getApiErrorMessage(
          error,
          isEditing
            ? "Could not update the resource."
            : "Could not share the resource.",
        ),
      });
    }
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>
          {isEditing ? "Edit this resource" : "Share something worth knowing"}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Changes are visible to everyone straight away."
            : "A link to the specific thing, and why you think it is worth knowing."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Browser validation stays on — `required` and `type="url"` catch the
            obvious cases before a round trip. The Zod schema is the authority
            on anything subtler. */}
        <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {errors.root?.message ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.root.message}
              </p>
            ) : null}

            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${FORM_ID}-title`}>Title</FieldLabel>
                  <Input
                    {...field}
                    id={`${FORM_ID}-title`}
                    required
                    maxLength={MAX_TITLE_LENGTH}
                    aria-invalid={fieldState.invalid}
                    placeholder="Sapiens: A Brief History of Humankind"
                  />
                  <FieldDescription>
                    The specific resource, not the site it happens to live on.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="url"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${FORM_ID}-url`}>Link</FieldLabel>
                  <Input
                    {...field}
                    id={`${FORM_ID}-url`}
                    type="url"
                    required
                    maxLength={MAX_URL_LENGTH}
                    aria-invalid={fieldState.invalid}
                    placeholder="https://www.goodreads.com/book/show/33710.Sapiens"
                  />
                  <FieldDescription>
                    The page someone should land on, not a homepage.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="type"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  orientation="responsive"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel htmlFor={`${FORM_ID}-type`}>
                    What kind of thing is it?
                  </FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id={`${FORM_ID}-type`}
                      aria-invalid={fieldState.invalid}
                      className="w-full"
                    >
                      <SelectValue placeholder="Pick one" />
                    </SelectTrigger>
                    <SelectContent position="item-aligned">
                      {RESOURCE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {RESOURCE_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="why"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${FORM_ID}-why`}>
                    Why is it worth knowing?
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={`${FORM_ID}-why`}
                    required
                    rows={5}
                    maxLength={MAX_WHY_LENGTH}
                    aria-invalid={fieldState.invalid}
                    className="min-h-32"
                    placeholder="The clearest explanation of how human institutions co-evolved that I have read."
                  />
                  <div className="flex items-baseline justify-between gap-4">
                    <FieldDescription>
                      This is the part that makes it worth sharing.
                    </FieldDescription>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {field.value.length}/{MAX_WHY_LENGTH}
                    </p>
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="tags"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${FORM_ID}-tags`}>Tags</FieldLabel>
                  <TagInput
                    id={`${FORM_ID}-tags`}
                    value={field.value}
                    onChange={field.onChange}
                    invalid={fieldState.invalid}
                    maxTags={MAX_TAGS}
                  />
                  <FieldDescription>
                    Up to {MAX_TAGS}, separated by commas. Optional, but they
                    are how people find this later.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <AnonymityToggle
              defaultAnonymous={anonymousByDefault}
              id={`${FORM_ID}-anonymous`}
            />
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter>
        <Field orientation="horizontal">
          {isEditing ? (
            <Button asChild variant="ghost">
              <Link href={`/resources/${resource.id}`}>Cancel</Link>
            </Button>
          ) : null}
          <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Share it"}
          </Button>
        </Field>
      </CardFooter>
    </Card>
  );
}
