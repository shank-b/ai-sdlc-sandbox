Story: #2

# Spec: Add, complete and delete to-do items

## 1. Summary

People who keep a personal to-do list have nowhere simple to track what they need to do, so tasks get lost and finished items clutter the view. This story gives a signed-in user a private list where they can add an item, mark it complete (and undo that), and delete it after a confirmation. Items persist between visits and are never visible to another user.

## 2. Scope mode

**Hold.** The issue is already the narrowest useful slice (per-user CRUD plus a minimal sign-in). Sharing and assignment are deliberately left for a later story.

## 3. User stories

- **US1:** As a signed-in user, I want to add a to-do item with a short title so that I can capture a task quickly.
- **US2:** As a signed-in user, I want to mark an item complete and un-complete it so that I can track progress and fix a mistake.
- **US3:** As a signed-in user, I want to delete an item after confirming so that I can remove tasks I no longer need without deleting by accident.
- **US4:** As a signed-in user, I want to see my open items first and my completed items clearly distinct so that I can see what is left at a glance.
- **US5:** As a signed-in user, I want my items to still be there on my next visit, and to be only mine, so that I can trust the list.
- **US6:** As a user, I want to sign in by picking an account that I set up in a local seed file, which is never pushed to git, so that the app knows whose list to show and no account data lives in the repository.

## 4. Acceptance criteria

Test type in brackets: unit, property or e2e.

### US1: Add

- **AC1.1** Given I am signed in, when I type "Buy milk" in the add field and submit, then "Buy milk" appears in my open items and the add field is empty. [e2e]
- **AC1.2** Given I am signed in, when I submit an empty or whitespace-only title, then no item is created, the message "Title is required" appears next to the field, and keyboard focus stays on the field. [e2e; unit for the title rule]
- **AC1.3** Given I submit a title with leading or trailing spaces, then the saved title has them removed. [unit]
- **AC1.4** Given a title longer than the maximum length (Open question 3), when I submit, then no item is created and a message names the limit. [unit, e2e]
- **AC1.5** Given a title containing markup such as `<b>x</b>`, when it is shown, then it is displayed as literal text and nothing is executed. [e2e]
- **AC1.6** Given I have no items, when I open the list, then I see the empty-state message "Nothing here yet. Add your first to-do above." and the add field. [e2e]
- **AC1.7** Given I add an item, then it shows its created time in en-IN format in the IST time zone (for example "22 Oct 2026, 7:12 pm IST"). [unit for formatting, e2e]
- **AC1.8** Given I submit the add form with the Enter key, then it behaves the same as pressing the Add button. [e2e]

### US2: Complete and un-complete

- **AC2.1** Given an open item, when I tick its checkbox (click or tap on the checkbox or its title, or press Space with it focused), then the item moves into the completed section, shown struck through in grey. [e2e]
- **AC2.2** Given a completed item, when I untick it, then it returns to the open section in normal style. [e2e]
- **AC2.3** Given I complete an item and reload the page, then it is still completed. [e2e]
- **AC2.4** Given saving a change fails, when I tick an item, then an error with a retry action is shown and the item keeps its previous state. [e2e]
- **AC2.5** Given any item, the checkbox and title together form a tap target of at least 44 by 44 px at a 390 px wide screen. [e2e]

### US3: Delete

- **AC3.1** Given an item, when I press its "Delete <title>" button, then a confirmation dialog names the item and offers Cancel and Delete. [e2e]
- **AC3.2** Given the dialog is open, when I press Delete, then the item is removed from the list and stays gone after a reload. [e2e]
- **AC3.3** Given the dialog is open, when I press Cancel or Esc, then the list is unchanged and keyboard focus returns to that item's "Delete <title>" button. [e2e]
- **AC3.4** Given the dialog is open, then keyboard focus starts on Cancel and Tab cannot leave the dialog. [e2e]
- **AC3.5** Given I confirm a delete and it fails, then an error is shown and the item remains. [e2e]

### US4: Order and distinction

- **AC4.1** Given I have open and completed items, then all open items are listed above all completed items, and the two groups are labelled. [property: ordering holds for any mix of items; e2e]
- **AC4.2** Given items in a group, then they are in the order set by Open question 4. [property]
- **AC4.3** Given a completed item, then it is distinguishable without colour alone (struck through and under a "Completed" label), and its text has a contrast ratio of at least 4.5:1 against the background. [e2e]

### US5: Persistence and privacy

- **AC5.1** Given I add items, sign out, and sign in again (also on another browser), then I see the same items. [e2e]
- **AC5.2** Given two users, A and B, each with items, when A views the list, then none of B's items appear, and the other way round. [e2e; property over generated users and items]
- **AC5.3** Given A knows the id of one of B's items, when A tries to complete, un-complete or delete it, then the server refuses (not found or forbidden), B's item is unchanged, and no data about it is returned. [e2e at the HTTP level; unit for the ownership rule]
- **AC5.4** Given no session, when I request the list or any item action, then I am sent to sign in and no item data is returned. [e2e]
- **AC5.5** Given errors or logs produced by any of these actions, then they contain no session identifiers or tokens. [unit or e2e log check]

### US6: Sign-in (minimal)

- **AC6.1** Given a local seed file that defines accounts (at least two, for example "Asha" and "Ben"), then the sign-in screen lists exactly those accounts as "Continue as <name>" buttons. [e2e]
- **AC6.5** Given the local seed file is missing or defines no accounts, then the sign-in screen shows "No accounts set up. Add accounts to your local seed file." with no sign-in buttons, and no list is reachable. [e2e]
- **AC6.6** Given a fresh clone, then the repository holds no real account data: the local seed file is excluded from git, and only an example file with made-up names is committed to show the format. [unit or script check on the ignore rule and the example]
- **AC6.2** Given I pick an account, then I land on that account's list, which shows "Signed in as <name>". [e2e]
- **AC6.3** Given I press Sign out, then my session ends and the list is no longer reachable without signing in again. [e2e]
- **AC6.4** Given sign-in fails, then the message "Sign-in failed. Pick an account to try again." appears and I stay on the sign-in screen. [e2e]

### Cross-cutting

- **AC7.1** Given the list at 390 px and at 1280 px wide, then there is no horizontal scroll and nothing is clipped. [e2e]
- **AC7.2** Given only a keyboard, then I can sign in, add, complete, un-complete and delete an item, and the tab order is: sign out, add field, Add, then per item the checkbox and Delete. [e2e]
- **AC7.3** Given each Delete button, then its accessible name includes the item title (for example "Delete Buy milk"). [e2e]

## 5. Out of scope

- Sharing lists, assigning items to others, or any team or shared list.
- Reminders, due dates, tags, offline use.
- Editing an item's title after creation.
- Reordering items by hand, search, filters, bulk actions, undo after delete.
- Real sign-in (passwords, email, social login, sign-up, account recovery). Only the minimal sign-in from a local seed file in US6.
- Creating or editing accounts from inside the app. Accounts are set up only by editing the local seed file.
- The calm green accent from the visual direction: the owner waived it in design review, so it is left to hi-fi and the build.
- An audit trail of who created, completed or deleted what (see Open question 5).

## 6. Non-functional

- **Accessibility:** WCAG 2.2 AA. Tap targets of at least 44 px, text contrast of at least 4.5:1, a visible focus style, inline errors announced to screen readers, the confirmation dialog traps focus and closes on Esc.
- **Security and privacy:** every read and write of an item is checked against the signed-in user on the server; hiding items in the UI is not enough. No secrets, tokens or session identifiers in logs, errors or analytics. Titles are untrusted text. Account data comes only from the local seed file, which is never committed and never written to logs.
- **Performance:** list loads, and each add, complete or delete shows its result, in under 1 s at p95 for a list of up to 200 items on a normal connection. This is a working target, not an agreed SLA (Open question 6).
- **Data retention:** items are kept until their owner deletes them. Delete is permanent (no recovery).
- **Locale:** en-IN formats and the IST time zone for all displayed dates and times.

## 7. UI

- Chosen wireframes: sign-in B (pick a seeded account), list A (single column, add field on top), confirm A (modal dialog), in `wireframes/` (open `wireframes/board.html`).
- Design review: `design-review.md`. Re-review scores were 8 on Hierarchy, Clarity, Consistency, Accessibility and Mobile fit, 9 on Key-flow friction and 6 on Distinctiveness. The recorded verdict was rework; the owner waived the Distinctiveness finding on the issue, so the design review is treated as a pass.
- Two optional fixes from the review are not required for this spec: removing the inherited row borders under the "Continue as …" buttons, and giving Sign out a quieter style than Add.
- Copy to use: "Title is required", "Nothing here yet. Add your first to-do above.", "Couldn't save that change. Your list is unchanged.", "Sign-in failed. Pick an account to try again."

## 8. Open questions

| # | Question | Options | Recommended | Blocks the plan? |
| --- | --- | --- | --- | --- |
| 1 | **Answered by the owner:** auth is set up through a local seed file that is not pushed to git. Everything under `auth/` still needs owner review before merge. | n/a | n/a | No (resolved) |
| 2 | **Answered by the owner:** accounts live in the local seed file, so this sign-in is dev-only. A real-auth story is needed before real users. File that follow-up. | n/a | n/a | No (resolved) |
| 10 | What does each account in the seed file hold? | (a) display name only (the id is derived or generated); (b) name plus a PIN or password | (a). Picking an account is the whole sign-in, so a secret adds nothing yet | No (needed for AC6.1) |
| 11 | How do e2e tests and CI get accounts, since the real seed file is not in git? | (a) CI copies the committed example file into place; (b) tests create their own accounts at start-up | (a), because the example already has two made-up users | No |
| 3 | Maximum title length. | 100, 140, 200 characters | 140 characters, counted after trimming | No (needed for AC1.4) |
| 4 | Order within each group. | Open: newest first or oldest first. Completed: most recently completed first or newest first | Open: newest first. Completed: most recently completed first | No (needed for AC4.2) |
| 5 | The constitution says every action "a teammate didn't take" is auditable (who created, completed, deleted what). Does that apply to this single-user story? | (a) no, out of scope here; (b) yes, record created / completed / deleted events | (a), because only the owner can touch their items. Revisit when sharing arrives | No |
| 6 | Is the 1 s p95 / 200 items target right? | keep, loosen, or drop | Keep as a working target | No |
| 7 | Should two items with the same title be allowed? | allow, or reject duplicates | Allow | No |
| 8 | Save-failure copy differs between the storyboard ("Couldn't update. Retry") and the wireframe ("Couldn't save that change. Your list is unchanged."). | either | Use the wireframe wording, and update the storyboard | No |
| 9 | Constitution region note: default `us-east-1`, "revisit if the team is India-based". This story's users use en-IN / IST. | keep `us-east-1`, or choose a region closer to India | Decide at plan time; no effect on this spec | No |

## 9. Risks

- **Authorisation gaps:** a missed ownership check on any item action would expose another user's data. Mitigation: AC5.2 and AC5.3 as property and HTTP-level tests, and security review.
- **Always-human paths:** the story touches `**/auth/**` and `db/migrations/**`, so it needs owner review. This can slow the build.
- **Accidental delete:** permanent delete with only a confirm step. Mitigation: a confirm that defaults focus to Cancel; undo is out of scope.
- **Untrusted titles:** escaping mistakes could allow script injection. Mitigation: AC1.5.
- **Time zones:** IST formatting bugs, for example near midnight UTC versus IST. Mitigation: unit tests with fixed timestamps across that boundary.
- **Visual distinctiveness:** the wireframes show no green accent, and hi-fi must supply it, or the product looks generic.
- **Placeholder sign-in outliving its purpose:** if it ships to real users it gives no real protection. Mitigation: Open question 2 (follow-up real-auth story).
- **Seed file committed by accident:** real names or secrets could reach git. Mitigation: AC6.6 (ignore rule plus example file), and a secret scan in review.
- **New contributors or CI with no seed file:** the app has no accounts. Mitigation: AC6.5 and Open question 11.
