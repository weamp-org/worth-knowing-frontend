"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trackCollectionCreated } from "@/lib/analytics";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  type CollectionFormValues,
  collectionFormSchema,
} from "@/lib/collection-form-schema";
import {
  type Collection,
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_TITLE_LENGTH,
} from "@/lib/collection-types";
import { createCollection, updateCollection } from "@/lib/collections-api";

/** Ties the submit button in the footer to the form in the body. */
const FORM_ID = "collection-form";

/**
 * Create a collection, or edit one you already own.
 *
 * One component for both, because the fields and the validation are identical —
 * editing only changes where the default values come from and which endpoint the
 * submit hits. Same shape as `ShareResourceForm`.
 */
export function CollectionForm({ collection }: { collection?: Collection }) {
  const router = useRouter();
  const isEditing = collection !== undefined;

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionFormSchema),
    mode: "onTouched",
    defaultValues: collection
      ? {
          title: collection.title,
          description: collection.description ?? "",
          // Editing shows what is stored, not what the default is. Re-prefilling
          // from the schema default would silently publish a private collection
          // the moment the default changed.
          isPrivate: collection.isPrivate,
        }
      : {
          title: "",
          description: "",
          // Private, matching the column default. The backend would decide this
          // anyway, but the switch has to start somewhere truthful, and a new
          // collection that is published by default would be a surprise.
          isPrivate: true,
        },
  });

  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: CollectionFormValues) {
    try {
      const saved = collection
        ? await updateCollection(collection.id, values)
        : await createCollection(values);

      // Creations only, after success. Edits and the title/description they
      // carry are never sent to analytics.
      if (!collection) {
        trackCollectionCreated({
          collectionId: saved.id,
          isPrivate: values.isPrivate,
          hadDescription: values.description.trim().length > 0,
        });
      }

      toast.success(isEditing ? "Collection updated." : "Collection created.");

      // No `router.refresh()`: the collection routes are `force-dynamic`, so
      // arriving at the detail page re-fetches it from the backend.
      router.push(`/collections/${saved.id}`);
    } catch (error) {
      form.setError("root", {
        type: "server",
        message: getApiErrorMessage(
          error,
          isEditing
            ? "Could not update the collection."
            : "Could not create the collection.",
        ),
      });
    }
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>
          {isEditing ? "Edit this collection" : "New collection"}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Changes are visible straight away."
            : "Group resources that belong together. You can add them afterwards."}
        </CardDescription>
      </CardHeader>

      <CardContent>
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
                    maxLength={MAX_COLLECTION_TITLE_LENGTH}
                    aria-invalid={fieldState.invalid}
                    placeholder="Read before starting research"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${FORM_ID}-description`}>
                    Why do these belong together?
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={`${FORM_ID}-description`}
                    rows={3}
                    maxLength={MAX_COLLECTION_DESCRIPTION_LENGTH}
                    aria-invalid={fieldState.invalid}
                    className="min-h-24"
                    placeholder="The four papers that made agent-based modelling click for me."
                  />
                  <div className="flex items-baseline justify-between gap-4">
                    <FieldDescription>
                      Optional. This is the part a reader has to go on, so a
                      titled list of links is worth less without it.
                    </FieldDescription>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {field.value.length}/{MAX_COLLECTION_DESCRIPTION_LENGTH}
                    </p>
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="isPrivate"
              control={form.control}
              render={({ field }) => (
                <div className="flex items-start gap-3">
                  <Switch
                    id={`${FORM_ID}-private`}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor={`${FORM_ID}-private`}
                      className="font-medium"
                    >
                      Keep this collection private
                    </Label>
                    {/*
                      The copy is load-bearing, in the same way
                      `ProfilePrivacySetting`'s is. "Private" on a collection
                      reads as "this disappears", and what actually happens is
                      narrower: it only decides who can *open the page*. Nothing
                      inside is re-attributed, and a resource somebody else shared
                      anonymously stays anonymous either way. Saying so is the
                      difference between a switch people trust and one they are
                      afraid to touch.
                    */}
                    <p className="text-sm text-muted-foreground">
                      {field.value
                        ? "Nobody but you can open this collection. You can make it public at any time."
                        : "Anyone can open this collection, and it will be listed on your profile. Resources you collected keep their own authors' names."}
                    </p>
                  </div>
                </div>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter>
        <Field orientation="horizontal">
          {isEditing ? (
            <Button asChild variant="ghost">
              <Link href={`/collections/${collection.id}`}>Cancel</Link>
            </Button>
          ) : (
            <Button asChild variant="ghost">
              <Link href="/collections">Cancel</Link>
            </Button>
          )}
          <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
            {isSubmitting
              ? "Saving…"
              : isEditing
                ? "Save changes"
                : "Create it"}
          </Button>
        </Field>
      </CardFooter>
    </Card>
  );
}
