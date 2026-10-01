# Comments

A resource's discussion, under the resource page.

Mirrors the backend's [comments doc](../worth-knowing-backend/docs/comments.md).
This page covers only what is frontend-specific.

## Routes

There is no comments *page*. The thread renders on `/resources/[id]`, below the
contribution it is about.

| Backend route | Access | Where it is used |
| --- | --- | --- |
| `GET /resources/:id/comments` | `@Public()` | The page, server-side |
| `POST /resources/:id/comments` | session | `CommentComposer` |
| `DELETE /resources/:id/comments/:id` | session | `CommentItem`, own comments only |

## One client component, and why

`CommentSection` is a client component, for the same reason `ResourceFeed` is: the
thread grows while you read it. Posting prepends, removing drops a row, and "load
more" appends a page — none of which a Server Component that only renders what it
fetched can do.

Everything else on the resource page stays a Server Component. `isSaved`,
`myCollections` and the first page of comments are all read during the render and
passed down, so no control appears late or has to correct itself after hydration.

## The first page is fetched server-side, with the session

`getCommentsForViewer` attaches the Clerk token even though the listing is `@Public()`.

That is the one thing here a client cannot work out for itself: `isMine` decides
whether a delete control is offered, and it has to be right on first paint. Without
the token every comment reads as not the reader's — including the one they just
posted, which would be a fact rather than a default. Same reasoning as
`SaveButton` taking `initialIsSaved` as a prop.

The composer is gated on `userId !== null` from the `auth()` the page already
read. **Absent**, not disabled: a disabled textarea reads as "not permitted" and
invites the reader to work out why.

## The count is `commentCount`, not `items.length`

The thread is paginated, so the list holds one page. Counting it locally would read
as the total until somebody loaded more, and then change under them.

`resource.commentCount` came with the resource, so it is the honest number for free —
the same reasoning as `savedCount` being on the resource response rather than behind
a second request.

## Replies are a quote, not a tree

A reply renders the parent's text as a `blockquote` above it, and replies land at
the **top** of the list like any other new comment rather than beneath the comment
they answer.

That is deliberate on both counts:

- The backend caps depth at one level and truncates the quoted text, so there is no
  tree to nest into. Indenting would promise a structure the data does not have.
- Replies come back in the same chronological stream as everything else.
  Re-sorting them client-side to sit under their parent would rebuild the tree
  locally, which is the thing the backend deliberately refused to model.

A reply still carries `parentId` to the backend, so the thread stays flat on the wire
and in the database.

## No `canComment` capability check

The resource page reads `auth()` once and passes `userId !== null` down. There is no
"can this person comment" capability to ask about — anybody signed in may, on any
resource — so a second helper would be a second place that has to remember to check.

## Removing a comment

Offered only when `comment.isMine`, never for an admin's path to remove somebody
else's comment. The backend permits that; surfacing it here would put a moderation
control in front of every reader for no benefit, and an admin surface belongs
somewhere deliberate.

Removal drops the row locally — the backend answers `204` with nothing to render.

## Markdown is not rendered

The backend stores plain text and this renders it as text, with
`whitespace-pre-wrap` so a paragraph somebody typed survives. No links become
anchors beyond the bare URL the browser makes for us, which is the same treatment the
`why` gets.

## Dates go through `formatDate`

The thread renders in the browser but its first page was formatted on the server,
and `formatDate` pins locale and time zone for exactly that reason. See
[dates.md](./dates.md).