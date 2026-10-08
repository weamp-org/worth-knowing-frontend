# Notifications

The bell and the inbox. Comments on your resources, and replies to your
comments — the backend's [notifications doc](../worth-knowing-backend/docs/notifications.md)
covers what earns one. This page covers only what is frontend-specific.

## Routes

| Route | Access | Notes |
| --- | --- | --- |
| `/notifications` | `auth.protect()` | Your inbox, newest first, first page only |

No `loading.tsx`, for the same reason `/saved` has none: a Suspense boundary
starts streaming a 200 before `auth.protect()` can 307 a signed-out visitor
to sign-in. Verified on `/saved`; the mechanism is identical here.

## The bell polls a counter, not the list

`NotificationBell` (in the signed-in header, before the share CTA — an unread
badge hidden behind a menu would be a notification about a notification)
refetches `GET /notifications/unread-count` every 30 seconds. The list itself
is server-rendered on the inbox page; refetching rows to read a number off
them would be the list endpoint doing a counter's job. The badge caps at
"99+": it answers "anything new", not "how many".

## Reading settles both halves

Visiting a row fires `markNotificationRead` without awaiting it — blocking
navigation on a bookkeeping write would punish the reader for the inbox's sake
— and invalidates the shared count query so the bell settles. The row's own
read styling settles on the next render. "Mark all read" does both at once:
invalidate, then `router.refresh()` to re-render the server rows as read.

The actor's name is plain text, not a profile link: the whole row already
links to the resource (`/resources/[id]#comments-heading`), and a link inside
a link is invalid HTML. A null actor renders as "Someone"; a deleted comment
renders as "The comment was removed." Neither state drops the row.
