# Comments

A resource's discussion, under the resource page.

Mirrors the backend's [comments doc](../worth-knowing-backend/docs/comments.md).
This page covers only what is frontend-specific.

## Routes

There is no comments *page*. The thread renders on `/resources/[id]`, below the
contribution it is about. The moderation queue is the one separate route, at
`/moderation`.

| Backend route | Access | Where it is used |
| --- | --- | --- |
| `GET /resources/:id/comments` | `@Public()` | The page, server-side |
| `POST /resources/:id/comments` | session | `CommentComposer` |
| `DELETE /resources/:id/comments/:id` | session, or admin | `CommentItem` for own comments; `CommentReportQueue` for any |
| `POST /resources/:id/comments/:id/report` | session | `ReportDialog`, from a comment |
| `POST /resources/:id/report` | session | `ReportDialog`, from `ResourceActions` |
| `GET /comment-reports` | **admin** | `/moderation`, server-side |
| `GET /resource-reports` | **admin** | `/moderation`, server-side |

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

## Reporting

Both a contribution and a comment can be reported, through one shared
`ReportDialog` — the same act on two different things, and two near-identical
components would drift.

**It is a dialog, not an inline panel**, which is what it replaced for two reasons
beyond the truncation:

- The inline panel expanded *inside* the comment list and pushed everything below it
  down, so filing a report lost your reading position.
- A one-line input caps what people write. Given a single-line box, people write a
  single line. The backend has always allowed 500 characters because a report is a
  complaint, and the UI was the thing stopping anyone using it.

The dialog quotes what is being reported. Reporting the wrong thing is otherwise
silent and unrecoverable.

**Nothing changes for any reader afterwards**, including the author. No badge, no
state on the reported thing, no marker — only the toast. Showing it would turn a
quiet signal into a scoreboard, and the backend agrees by writing nothing.

### Nothing in the wording implies removal

It was "Why should this be removed?", which is wrong for a category like
`BROKEN_LINK` where the honest outcome is usually a fix. And because no report is
ever shown to anybody but a moderator, that phrasing quietly implied a consequence the
product does not promise.

The label is now **"What's wrong?"**, and the dialog says plainly that *not everything
reported gets removed*. A `why` written carefully for a link that 404s is worth
surfacing; throwing the contribution away would lose something real.

### The category is a radio group, not a select

Four or five options, shown. A dropdown hides the list until it is already open, and
the point is partly that you can *see* that one of them fits. It also makes "something
else" visibly the last resort rather than the default.

Nothing is pre-selected. Defaulting to the first option would mean silently filing a
report as "spam" because that happened to be top of the list, which is worse than one
deliberate extra click. The submit button is disabled until a category is chosen.

The detail is a `Textarea`, not the single-line input it replaced. A one-line box caps
what people write — given one, they write one — and the backend has always allowed 500
characters because a report is a complaint.

### Report is not offered on your own

The backend refuses both kinds (`400`). For a contribution, `ResourceActions` already
knows the answer — it is one component precisely because Edit and Remove share a
single ownership probe — so Report is the *other* branch rather than a fourth button.
If somebody agrees with a report about their own post, `Remove` is the correct and
much stronger answer.

For a comment, the thread already has `isMine`, so the control is simply absent.

### `ResourceOwnerActions` became `ResourceActions`

It probes ownership once and renders Edit + Remove for the contributor, or Report for
anybody else. Adding Report as a separate component would have meant a second
identical ownership check, which is the duplication that component's own doc comment
argued against when Edit and Remove were first put together.

Signed out, the probe 401s and both branches render nothing — reporting needs a
session anyway, so a signed-out reader is given no control rather than one that would
fail when pressed.

## The moderation queues are on `/moderation`

One server component fetching both queues in parallel and rendering two sections,
each paginating on its own keyset. Merging them would mean a cursor spanning two
unrelated orderings.

There is **no role to check on the way in** — nothing in this API exposes the caller's
own role — so the page asks the queues and renders what it is told. A `403` becomes a
plain "you do not have access to this page" rather than a throw, because "you are not
an admin" is a state to render and not a fault; throwing would take the page to the
error boundary and tell a signed-in reader their session broke.

`force-dynamic`, because the whole page is per-admin and a cached render would be
another admin's queue.

Removal uses the **existing** `DELETE /resources/:id` and
`DELETE /resources/:id/comments/:id` routes — an admin could already call both. This
page only supplies the queue that says where to look. There is no separate moderation
delete.

The comment queue's `remove` takes the whole row rather than a bare comment id,
because the queue spans resources and the delete route is nested: there is no single
`resourceId` to read off the list.

Both queues drop **every** row for a removed thing. The backend cascades its reports
away, so leaving the others would show a moderator entries they can do nothing about.

The resource queue shows the title, the hostname, and the `why` in full. A moderator is
judging the reasoning as much as the link, and there is nothing below it to bury. Its
byline reads **"Shared anonymously"** where the contribution was anonymous — the
backend redacts it on purpose, and a moderator does not need a name to decide a link
is spam.

`reportCount` gets a filled badge above one and an outline badge at one — one report is
a hunch, several is a pattern, and that is the number being read first.

The **category** also renders as a badge, identically on every row. That is the whole
reason it is required: it is the part a moderator groups by, and showing it the same
way every time is what makes the queue scannable. The detail sits beside it and is the
part that has to be read one row at a time. An absent detail is rendered as nothing at
all rather than as a placeholder — a `BROKEN_LINK` with no prose is a perfectly good
report and needs no sentence to be actionable.

## Dates go through `formatDate`

The thread renders in the browser but its first page was formatted on the server,
and `formatDate` pins locale and time zone for exactly that reason. See
[dates.md](./dates.md).