Story: #2

## Problem and users

People who keep a personal to-do list have nowhere simple to track what they need to do. They
use scattered notes and messages, so things get lost and finished items clutter the list. There
is no quick way to add a task, mark it done, or remove it. This story builds that for one signed-in
user at a time: their own items, private to them.

## Answers

| # | Question | Recommended answer | Status | Confidence |
|---|----------|---------------------|--------|------------|
| 1 | Who and what today? | Individual users with no shared list; today they use scattered notes/messages, so items get lost and completed items clutter the view. | evidenced (issue body) | high |
| 2 | Why now? | No external evidence (no requests, data, or deadline cited) — this is the foundational first feature for the sandbox app. | assumed, confirmed by owner | high |
| 3 | Narrowest useful version? | Per-user items: add, complete, un-complete, delete with confirmation, open-first-then-completed ordering. Sharing/assignment is explicitly out (see Scope). | evidenced (issue) + owner decision | high |
| 4 | How do we know it worked? | Each acceptance criterion (add, complete/un-complete, delete+confirm, ordering, persistence, isolation) has a passing Playwright E2E test, plus unit/property tests in `packages/core` for ordering and isolation logic. | evidenced (CLAUDE.md Definition of Done) | high |
| 5 | What can go wrong? | Authorization (isolation must be enforced server-side, not just hidden in the UI); accidental deletion (mitigated by the required confirm step); unescaped input in the title field; keyboard accessibility of list controls. This story also touches `**/auth/**` (no auth exists yet) and `db/migrations/**`, both always-human paths needing CODEOWNERS review. | evidenced + owner-confirmed auth approach | high |
| 6 | Cheaper alternative? | No — this is core product functionality for the app being built; nothing to configure, buy, or reuse substitutes for an in-house to-do CRUD flow. | assumed | high |

## Scope mode

**Hold** — the issue is already right-sized as the narrowest useful wedge: one CRUD+auth slice,
no premature shared/assigned-list work. Confirmed with the owner.

**In scope:**
- Minimal placeholder sign-in (session/cookie) sufficient to attach a `userId` to every request —
  flagged for owner review since it lives under `**/auth/**`. Treated as dev-only; a production-grade
  auth system is a separate future story.
- Add a to-do item with a short title.
- Mark an item complete, and un-complete it again.
- Delete an item, gated by a confirmation step.
- List view: open items first, completed items visually distinct.
- Persistence across visits (Postgres via Drizzle).
- Per-user data isolation: one user's items are never visible or editable by another, enforced
  server-side.
- en-IN / IST-aware date/time formatting wherever a to-do's timestamps are shown.
- Keyboard-accessible list and controls; works on mobile and desktop browsers.

**Out of scope:**
- Sharing to-do lists, assigning items to other users, or any shared/team list (the constitution's
  broader "shared to-do app" vision — revisit as its own story once this wedge ships).
- Reminders, due dates, tags, offline use (explicitly excluded by the issue).
- Any change to a pre-existing auth system — there isn't one; this story adds only the minimal
  placeholder described above.

## Visual direction

Calm green accent; completed items struck through in grey; short, friendly empty-state copy.

## Key journeys

- J1: A new signed-in user adds their first to-do item and sees it appear in an empty list.
- J2: A user marks an open item complete and sees it move below open items, styled distinctly.
- J3: A user un-completes a previously completed item and sees it return to the open section.
- J4: A user deletes an item, confirms the prompt, and the item disappears permanently.
- J5: A user signs back in later (or on another device) and sees only their own items — none
  from any other user.

## Constraints

- Platform: Next.js (App Router) + TypeScript, Postgres via Drizzle ORM, Vitest, Playwright, npm.
- Accessibility: list and controls (add/complete/delete) must be keyboard-operable; works on
  mobile and desktop browsers.
- Performance: no explicit SLA beyond normal page-load expectations.
- Data: items persist in Postgres; en-IN / IST formatting for any displayed date/time.
- Always-human paths touched: `**/auth/**` (new minimal placeholder auth) and `db/migrations/**`
  (new items/users tables) — both require CODEOWNERS/owner review before merge.

## Success measures

- Every acceptance criterion in issue #2 (add, complete/un-complete, delete+confirm, ordering,
  persistence, isolation) is covered by at least one passing Playwright E2E test, plus supporting
  unit/property tests in `packages/core`.
- All CI checks (lint, typecheck, test) green before merge.

## Open questions

- Does the placeholder auth need to support two or more seeded test users for QA, so an isolation
  test can assert cross-user denial rather than just a single-user happy path? Recommended: yes —
  seed at least two users via `npm run seed`.
- Should the placeholder auth be replaced before any real deployment, or is it acceptable long-term
  for this sandbox? Recommended: treat it as throwaway/dev-only; file a follow-up story for
  production-grade auth before shipping to real users.

## Storyboard

Files: `storyboard.excalidraw` (editable), `storyboard.svg`, `storyboard.png`. Frames run left to right; dashed frames are failure or empty-state branches.

- **J1, first item:** Sign in (pick a seeded account: Continue as Asha / Continue as Ben) → Empty list ("Nothing here yet", add field) → First item shown (item with IST timestamp). Branch: adding an empty title shows an inline "Title is required" error and keeps focus on the field.
- **J2, complete:** Open items (two unchecked) → tick checkbox or press Space → Item completed (item moves under a "completed" divider, struck and grey). Branch: if the save fails, an error with retry shows and the item keeps its old state.
- **J3, un-complete:** Completed section → untick checkbox → Back in open (item returns to the open list).
- **J4, delete:** Item row with Delete → press Delete → Confirm dialog (Cancel / Delete) → confirm → Item gone. Branch: Cancel or Esc leaves the list unchanged and returns focus to Delete.
- **J5, return later:** Visit app with no session → redirect → Sign in → Own list only (only the signed-in user's items). Branches: a failed sign-in shows an inline error and stays on the sign-in screen; requesting another user's item id is rejected by the server (404/forbidden), not just hidden in the UI.
