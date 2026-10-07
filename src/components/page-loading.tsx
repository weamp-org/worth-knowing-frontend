/**
 * The spinner shown while a route segment loads.
 *
 * Shared by the three `loading.tsx` files rather than duplicated. It is
 * deliberately *not* at the app root: a root `loading.tsx` wraps every route in
 * a Suspense boundary, which makes Next start streaming the response as a 200
 * before the page can decide anything — and a `notFound()` raised after that
 * point can no longer change the status, so a missing resource answered 200
 * instead of 404. Scoping these to the segments that want one keeps the real
 * 404 on `/resources/[id]`.
 */
export function PageLoading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="border-border size-8 animate-spin rounded-full border-2 border-t-foreground" />
    </div>
  );
}
