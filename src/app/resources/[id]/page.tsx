import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { CollectionPicker } from "@/components/collection-picker";
import { CommentSection } from "@/components/comment-section";
import { ResourceActions } from "@/components/resource-actions";
import { SaveButton } from "@/components/save-button";
import { TagBadge } from "@/components/tag-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCachedMyCollections } from "@/lib/collection-queries";
import { getCommentsForViewer } from "@/lib/comments-queries";
import { ContributorByline } from "@/lib/contributor";
import { formatDate, getHostname } from "@/lib/format";
import {
  getCachedResource,
  getResourceOrNotFound,
} from "@/lib/resource-queries";
import { ACCESS_TYPE_LABELS, RESOURCE_TYPE_LABELS } from "@/lib/resource-types";
import { getSavedStateForViewer } from "@/lib/saved-queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    // Shares the `cache`d fetch with the page body below, so this costs one
    // request rather than two.
    const resource = await getCachedResource(id);

    return {
      title: `${resource.title} — Worth Knowing`,
      description: resource.why.slice(0, 160),
    };
  } catch {
    // The page itself decides whether this is a 404 or a real fault; metadata
    // should never be the thing that throws.
    return { title: "Worth Knowing" };
  }
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resource = await getResourceOrNotFound(id);

  // Only fetched for a signed-in reader, and only because the save control
  // cannot render itself honestly without it. `auth()` resolves server-side, so
  // the control appears in the first paint rather than popping in a tick later —
  // and a signed-out reader costs nothing.
  const { userId } = await auth();

  // Both server-side and both only for a signed-in reader. `auth()` resolves
  // during the render, so neither control ever appears late or has to correct
  // itself after hydration.
  const [myCollections, isSaved] = userId
    ? await Promise.all([
        getCachedMyCollections(userId, resource.id),
        getSavedStateForViewer(resource.id, userId),
      ])
    : [null, null];

  // Fetched for every reader, unlike the two above: the thread is public on the
  // backend. The session token is passed so each comment arrives with `isMine`
  // decided — which is the one thing here a client cannot work out for itself.
  const comments = await getCommentsForViewer(resource.id);

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <Badge variant="secondary">{RESOURCE_TYPE_LABELS[resource.type]}</Badge>
        {resource.accessType !== "UNKNOWN" ? (
          <Badge variant="outline">
            {ACCESS_TYPE_LABELS[resource.accessType]}
          </Badge>
        ) : null}
        <time dateTime={resource.createdAt}>
          Shared {formatDate(resource.createdAt)}
        </time>
      </div>

      <h1 className="font-heading text-4xl font-semibold tracking-wide">
        {resource.title}
      </h1>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <a href={resource.url} target="_blank" rel="noopener noreferrer">
            Open resource
          </a>
        </Button>
        <a
          href={resource.url}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {getHostname(resource.url)}
        </a>
        <ResourceActions
          resourceId={resource.id}
          title={resource.title}
          why={resource.why}
        />
        {/*
          Save is for everybody, including signed-out readers: the count is
          public, and it is the one signal on this page that says anybody else
          found this worth coming back for. Only the toggle itself needs a
          session, and the component turns out to be a no-op then — so it is
          rendered for all and simply 401s if pressed signed out. Gate it here
          instead, on the session we already read.
        */}
        {isSaved !== null ? (
          <SaveButton
            resourceId={resource.id}
            initialIsSaved={isSaved}
            initialSavedCount={resource.savedCount}
          />
        ) : null}
        {/*
          Curating happens here, after the contribution, rather than as a step in
          the share form. The central contribution stays exactly as simple as it
          was, and somebody who finds a resource months later can still collect
          it.

          Gated server-side on `auth()`, so a signed-out reader's markup does not
          contain it at all rather than rendering a control that decides to hide
          itself after hydration.
        */}
        {myCollections ? (
          <CollectionPicker
            resourceId={resource.id}
            initialCollections={myCollections.items}
          />
        ) : null}
      </div>

      <section className="border-l-2 border-border pl-6">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Why it is worth knowing
        </h2>
        <p className="mt-2 leading-relaxed whitespace-pre-wrap">
          {resource.why}
        </p>
      </section>

      <footer className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <ContributorByline resource={resource} avatarSize="md" />
        {resource.tags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} />
        ))}
      </footer>

      {/*
        Discussion, below the contribution it is about.

        Fetched server-side with the session token so each comment arrives with
        `isMine` already decided — the same reason `isSaved` is read here rather than
        in the browser. A thread that renders and then corrects itself is worse than
        one that is simply short.

        Rendered for every reader, signed out included, matching the backend's
        `@Public()` listing. The composer is what needs a session, and the section
        decides that from the `userId` already read above rather than letting a
        control appear and hide itself after hydration.
      */}
      <CommentSection
        canComment={userId !== null}
        initialPage={comments}
        resourceId={resource.id}
        totalCount={resource.commentCount}
      />
    </article>
  );
}
