import type { Metadata } from "next";
import Link from "next/link";

import { ResourceOwnerActions } from "@/components/resource-owner-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { contributorLabel } from "@/lib/contributor";
import { formatDate, getHostname } from "@/lib/format";
import {
  getCachedResource,
  getResourceOrNotFound,
} from "@/lib/resource-queries";
import { ACCESS_TYPE_LABELS, RESOURCE_TYPE_LABELS } from "@/lib/resource-types";

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
        <ResourceOwnerActions resourceId={resource.id} title={resource.title} />
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
        <span>{contributorLabel(resource)}</span>
        {resource.tags.map((tag) => (
          <Badge key={tag.id} variant="ghost" asChild>
            <Link href={`/?tag=${encodeURIComponent(tag.slug)}`}>
              {tag.name}
            </Link>
          </Badge>
        ))}
      </footer>
    </article>
  );
}
