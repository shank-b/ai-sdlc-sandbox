Story: #2

# Design re-review: wireframes for add, complete and delete to-dos

Reviewed: `design-brief.md` (including the Visual direction line), `storyboard.png` (sign-in B in J1 and J5), `wireframes/board.html`, all 7 variant files and all 14 screenshots. Measured in Playwright at 390 px and 1280 px. Reviewer: ux-reviewer (did not create these artifacts). This replaces the first review (verdict: rework, 8 changes).

## Measurements

| Check | Result |
| --- | --- |
| Horizontal overflow, variant files | None. All 7 files at 390/390 and 1280/1280 |
| Horizontal overflow, board | None. Columns wrap: 2 per row at 1280 px, 1 at 390 px. No broken images |
| List A and confirm files: checkbox hit area | `<label class="chk">` wraps checkbox and title: 280x44 at 390 px, 990x44 at 1280 px. Clicking the title toggles the box. Checkbox drawn at 24x24 |
| Per-row Delete (A files) | Underlined text button, 64x44, #444, named per item ("Delete Buy milk") |
| Elements under 44 px (list A, confirm A/B, sign-in A/B) | None |
| Completed text and timestamp meta | #595959 on #fff, about 7.0:1. Pass. Strikethrough kept |
| Section headings h2 | #555, about 7.5:1. Pass |
| Confirm A | `showModal()` with backdrop. Focus starts on Cancel. Tab cycles Cancel, Delete. Esc closes. Delete is filled dark, Cancel grey. Focus return to the row's Delete is only annotated (fine for a static wireframe) |
| List A keyboard order | Sign out, input, Add, then per row: checkbox, Delete. Logical |
| J1 empty-title state | `aria-invalid`, `aria-describedby="e-e"`, `role=alert`, field autofocused |
| Duplicate ids | None in list A, confirm A/B, sign-in B. Still present in list B/C and sign-in A (not chosen) |
| Lists B and C | Not reworked: checkboxes 13x13, Delete a heavy unnamed button, list B summary 22 px tall |

## Scores

| Dimension | Score | Evidence |
| --- | --- | --- |
| Hierarchy | 8 | List A: title, add row, then rows. Delete is a quiet link. Confirm A: destructive Delete clearly differs from Cancel. Sign out is a bordered grey button with the same weight as Add |
| Clarity | 8 | J1 "Title is required" present. "Signed in as **Asha**" on every list screen. Good copy ("Couldn't save that change. Your list is unchanged.", "Delete "Buy milk"? This can't be undone."). Mismatch: storyboard J2 says "Couldn't update. Retry", wireframe says "Couldn't save that change…" |
| Consistency | 8 | List A, confirm A and confirm B share one header, row and Delete pattern. List B/C still use the old row pattern (not chosen) |
| Accessibility | 8 | Chosen files all at least 44 px, about 7:1 contrast, unique Delete names, modal focus on Cancel, inline error wired. Unproven: focus return to row's Delete is annotated only; native checkbox focus ring is the only focus style |
| Mobile fit | 8 | Nothing clips at 390 px. Row label gets 280 of 358 px; "Call the bank about the card" fits on one line. Header is tight but fits |
| Key-flow friction | 9 | J1: one tap to pick an account, then type and Add. J2/J3: one tap on a 280x44 target. J4: two taps, Cancel is the safe default. J5: redirect, then one tap |
| Distinctiveness | 6 | Brief says: "Calm green accent; completed items struck through in grey; short, friendly empty-state copy." Strikethrough and empty copy are shown. The green accent is not: everything is greyscale system-ui, and the only colour is the browser's default blue checkbox. The board doesn't mention the direction |

## What a 10 looks like

- **Distinctiveness (6):** The chosen wireframes (sign-in B, list A, confirm A) show the one accent the brief asks for. Checkbox `accent-color`, the Add button and the focus ring all use one calm green that passes contrast (for example #1F7A4D, about 5.3:1 with white text). The confirm Delete stays a separate destructive style. The board carries a one-line "Visual direction" note so hi-fi and the build start from it, not from browser defaults.

## AI-slop flags

No gradient hero, emoji, stock icons, lorem ipsum or invented testimonials. Minor:

- **Every empty state:** centred copy in a dashed box is a generic pattern. Acceptable at low-fi; in hi-fi the friendly voice should carry it, not the box.
- **Sign-in B:** each "Continue as …" button sits in an `<li>` that inherits the list-row bottom border, drawing dividers that mean nothing.
- **List B:** the annotation "(add field pinned to the bottom of the screen)" renders as UI text, and the empty-state copy still says "above". Unchosen variant.
- **Confirm A, 390 px shot:** the dialog covers part of the monospace annotation. Cosmetic.

## Recommendation (per screen)

- **Sign in: B (pick a seeded account).** Matches the storyboard (J1, J5); its error copy "Sign-in failed. Pick an account to try again." matches the J5 failure branch. One tap. Take nothing from A. Remove the stray row borders.
- **To-do list: A (single column, add on top).** Every rework applied; shortest J2/J3 path. Take from B, later: collapse Completed once it grows past a threshold.
- **Delete confirmation: A (modal dialog).** Real modal, safe default focus, distinct destructive action, names the item; matches J4. B uses the same copy, so nothing extra to take.

## Status of the 8 prior changes

| # | Change | Status |
| --- | --- | --- |
| 1 | Checkbox and title in one `<label>`, at least 44x44 | Resolved (list A, confirm A/B): 280x44, title click toggles. Not applied to B/C (not chosen) |
| 2 | Demote Delete, name it "Delete <title>" | Resolved (list A, confirm A/B) |
| 3 | Completed and meta text at 4.5:1 or better | Resolved: #595959, about 7.0:1 |
| 4 | Confirm A as a modal, destructive Delete, Cancel focus, Esc annotation | Resolved |
| 5 | J1 "Title is required" inline error | Resolved |
| 6 | Signed-in user and Sign out on the list | Resolved |
| 7 | Unique ids; one word for cancel | Resolved for chosen files; duplicates remain only in unchosen list B/C and sign-in A |
| 8 | Board columns wrap | Resolved: no sideways scroll at 390 or 1280 px |

Visual direction: partly reflected (grey strikethrough and short empty copy yes; green accent missing). Sign-in B: reflected correctly in the storyboard (J1, J5) and `signin-b.html`.

## Verdict: rework

All 8 structural changes landed. Every dimension is 8 or 9 except Distinctiveness at 6; the pass rule needs 7 or more everywhere. This is a small, cosmetic rework. No journey has a blocking friction.

Changes the ux-designer must make:

1. **Apply the visual direction to the chosen variants** (`signin-b.html`, `list-a.html`, `confirm-a.html`): one calm green accent on checkbox `accent-color`, the Add button and the focus ring, at 4.5:1 or better against its background (for example #1F7A4D); keep the confirm Delete as a separate destructive style; re-shoot the screenshots at 390 px and 1280 px.
2. **Add the visual direction line to `board.html`** next to the intro.
3. **Sign-in B: remove the inherited row borders** under the "Continue as …" buttons.
4. **Optional, not blocking:** give Sign out a quieter style than Add; pick one save-failure string between storyboard ("Couldn't update") and wireframe ("Couldn't save that change"), or leave it to the spec.

Carry into the spec and E2E (no wireframe change needed): Esc or Cancel on the confirm dialog returns focus to the row's "Delete <title>" button.

Open question for the owner: Distinctiveness is the only score under 7 and it is about colour in low-fi wireframes. Waive it and pass now, leaving the accent to hi-fi?
