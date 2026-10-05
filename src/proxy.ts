import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * `/` with a `?tag=` query is the old address of a tag, and now permanently lives
 * at `/tags/<slug>`.
 *
 * ## Why this runs in the proxy rather than in `next.config.ts` redirects
 *
 * Two reasons, the first of which is a bug this replaces.
 *
 * **`next.config` redirects corrupt slugs containing `#`.** The capture group is
 * decoded when it is read out of the query string but is **not re-encoded** when
 * substituted into the destination, so a real slug from this app's allowlist
 * (`C#`, which `slugify.util.ts` keeps precisely so it does not collapse into `c`
 * and collide with the C language tag) came out as `/tags/c` — silently truncated
 * at the fragment character, and pointing at a different tag or at nothing. This
 * was verified against the built server, not inferred.
 *
 * **A redirect in the page component would be a client-side redirect, not an HTTP
 * status.** `(feed)/loading.tsx` puts the homepage behind a Suspense boundary, and
 * once a response has begun streaming the status can no longer be changed — a
 * `redirect()` raised after that point becomes a client-side navigation
 * (`streaming.md`). This runs before any rendering, so the status is real.
 *
 * ## 308, and permanently
 *
 * **308 rather than 307** because this will never need reversing: the backend
 * documents the slug as permanent identity ("the slug is the tag's identity...
 * renaming it would break every existing link"), so there is never a case where
 * this mapping should be undone. 308 is the status crawlers cache permanently.
 *
 * ## Encoding, done by hand
 *
 * The slug comes out of `searchParams.get("tag")` **already decoded** — which is
 * the `c#` this application is dealing with, not `c%23`. So it is encoded here
 * before going into the path, or the same truncation returns.
 *
 * `?tag=` with an empty value is deliberately **not** redirected. It renders the
 * unfiltered homepage, so redirecting it would send a person to a tag page named
 * nothing.
 *
 * ## Why the Location is absolute
 *
 * Next validates the `Location` header on the way out and rejects a bare path with
 * `ERR_INVALID_URL` — a raw `NextResponse` with `Location: /tags/x` 500s. So the
 * origin is taken from **`request.nextUrl.origin`, not from `NEXT_PUBLIC_SITE_URL`**.
 * That is the right host to redirect to on the merits: a redirect belongs on the
 * host the person asked for, so an alias or a preview deployment stays on itself
 * rather than being bounced to production.
 */
export default clerkMiddleware((_auth, request) => {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/") {
    const tag = searchParams.get("tag");

    if (tag) {
      /*
       * `new URL` rather than string concatenation, and it is doing real work
       * here: given an already-encoded path it preserves the escapes instead of
       * re-normalising them, so `%23` survives as `%23` and `%2B%2B` survives as
       * `%2B%2B`. Verified in Node against each character this app's slug
       * allowlist permits (`.`, `+`, `#`, `-`).
       */
      const location = new URL(
        `/tags/${encodeURIComponent(tag)}`,
        request.nextUrl.origin,
      ).toString();

      return new NextResponse(null, {
        status: 308,
        headers: { Location: location },
      });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
