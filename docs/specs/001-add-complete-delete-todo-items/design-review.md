Story: #2

# Design review: wireframes for add, complete and delete to-dos

Reviewed: `design-brief.md`, `storyboard.png`, `wireframes/board.html`, all 7 variant files and all 14 screenshots at 390 px and 1280 px. Measured in Playwright via `file://` URLs. Reviewer: ux-reviewer (did not create these artifacts).

## Measurements

| Check | Result |
| --- | --- |
| Page horizontal overflow, variant files | None. `scrollWidth` equals `clientWidth` (390/390 and 1280/1280) for all 7 files |
| Board horizontal overflow | The page does not overflow, but the variant rows do. "To-do list" row: 1606 px of content in a 1248 px box at 1280 px, so variant C sits partly off screen. At 390 px every row scrolls sideways (1064/358, 1606/358, 1064/358) |
| Item checkboxes | **13x13 px** in every list and confirm variant. No wrapping `<label>`, so the title text is not clickable. They do have an accessible name (`aria-label="Mark Buy milk done"`) |
| Buttons (Add, Delete, Sign in, Retry, Cancel, Keep) | All at least 44 px. Pass |
| `<summary>Completed (1)</summary>` (list B) | 22 px tall. Fails |
| Delete button names | Every row says just "Delete" (3 times in list A), so a screen reader can't tell which item each deletes |
| Completed-item text | #888 on #fff = **3.54:1** at 16 px. Fails AA |
| Timestamp meta text | #777 on #fff = **4.48:1** at 13.3 px. Fails AA, narrowly |
| Placeholder | 4.19:1. It has a hidden label, so minor |
| Add input label | Hidden `<label for="a">`, but `id="a"` repeats across the 3 state panels, so only the first is labelled. A wireframe artifact; don't carry it into the build |
| Confirm A dialog | `<dialog open aria-labelledby>` opens non-modal: no backdrop, no focus trap. The 390 px shot shows the list underneath at full strength |
| List B "pinned" add field | Only an annotation. No fixed or sticky element exists, so the thumb-reach claim is not shown |
| Error banners | Use `role=alert`. Good |

## Scores

| Dimension | Score | Evidence |
| --- | --- | --- |
| Hierarchy | 6 | "My to-dos" title and the Add row read first, which is correct. But in every row the grey bordered Delete button (about 80x46 px) is the heaviest thing, while the main per-row action, the checkbox, is a 13 px square. Delete looks as heavy as Add. In confirm A, Cancel and Delete are styled the same |
| Clarity | 7 | Good copy: "Couldn't save that change. Your list is unchanged.", "Delete "Buy milk"? This can't be undone.", en-IN timestamps ("22 Oct 2026, 7:12 pm IST"). Problems: the storyboard's J1 "Title is required" error state is missing from every list variant; list B's empty state says "Add your first to-do above" when the field is below; no list screen shows who is signed in, but J5 depends on that |
| Consistency | 7 | Same type, borders and spacing in all 7 files. But confirm A uses "Cancel" and confirm B uses "Keep" for the same decision, and the add field moves between top (A, C) and bottom (B) |
| Accessibility | 4 | 13 px checkboxes with no label hit area; identical "Delete" names; completed text at 3.54:1 and meta text at 4.48:1; non-modal dialog; 22 px summary; duplicate ids. Positives: aria-labels on checkboxes, a label on the add input, `role=alert` on errors, all buttons at least 44 px |
| Mobile fit | 6 | Nothing clips at 390 px. But the J2 tap target is 13 px, the Delete column takes about 22% of the row width so "Call the bank about the card" is squeezed, list B's thumb-reach benefit is only claimed, and the confirm A modal doesn't separate itself from the page at 390 px |
| Key-flow friction | 7 | J1: type, then Add. J2/J3: one tap each in A and C; B adds a disclosure tap before J3. J4: two taps. J5: one field (sign-in A) or one tap (sign-in B). Nothing blocks the flow, but the tiny checkbox makes J2/J3 error-prone on a phone |
| Distinctiveness | 5 | Default system-ui with grey boxes. Expected for low-fi, but nothing yet says "this product" |

## What a 10 looks like

- **Hierarchy (6):** The whole row (checkbox and title) is the tap target and visually leads. Delete is a quieter secondary control: text or icon button, still at least 44 px, low-emphasis colour. In the dialog, Delete is styled as destructive and clearly differs from Cancel.
- **Accessibility (4):** Checkbox and title are wrapped in one `<label>` with a hit area of at least 44x44. Each Delete is named "Delete Buy milk". Completed and meta text reach at least 4.5:1 (for example #595959; keep the strikethrough). The confirm uses `showModal()` with a backdrop, focus starts on Cancel, and Esc or Cancel returns focus to the row's Delete, as storyboard J4 says. The add input has `aria-describedby` pointing at the "Title is required" message.
- **Mobile fit (6):** The 390 px shot shows a checkbox row that is easy to hit with a thumb. Titles get the full row width (Delete compact or right-aligned without a wide button). The dialog sits on a dimmed backdrop. If bottom placement is chosen, show it with real sticky positioning.
- **Distinctiveness (5):** One line of visual direction for the hi-fi stage (accent colour, completed-item treatment, empty-state voice) so the build doesn't ship browser defaults. Can wait; doesn't block structure.

## AI-slop flags

None of the usual patterns: no gradient hero, emoji, stock icons, lorem or invented testimonials. Minor:

- List C empty state: the dashed "Completed (0) — Finished items land here." box takes a full block and says almost nothing.
- List B screenshots: the annotation "(add field pinned to the bottom of the screen)" appears as UI text, so the shot looks like a shipped label rather than a note.
- Empty-state copy is centred in a dashed box in all variants. Generic, but acceptable at low-fi.

## Recommendation

- **Sign in: B (pick a seeded account).** Fits the brief's dev-only placeholder auth and the recommendation to seed two users. No typing and no unknown-name path; makes the J5 isolation demo trivial. **Owner decision needed:** this differs from storyboard J5, which shows a name field and an "unknown / blank name" branch. Either update the storyboard or keep A. From A, take the specific error copy.
- **To-do list: A (single column, add on top).** Shortest J2/J3 (one tap, Completed always visible), simplest reading order, no layout jump when an item moves (C's weakness). At 390 px, C is the same as A anyway. From B: collapse Completed past a threshold once it grows (later, not now).
- **Delete confirmation: A (modal dialog).** Matches storyboard J4 (Cancel/Delete, Esc returns focus to Delete), can trap focus, names the item. B is easier to miss and resizes the row. From B, keep "This can't be undone" next to the item name, which A already does.

## Verdict: rework

Changes the ux-designer must make:

1. **Checkbox hit area:** wrap checkbox and title in one `<label>`, at least 44x44 px, so tapping the title toggles the item (list A and the confirm files).
2. **Demote per-row Delete** to a secondary style (still at least 44 px) with the accessible name "Delete <title>".
3. **Contrast:** completed-item text and timestamp meta at 4.5:1 or better.
4. **Confirm A:** render as a modal (`showModal()` plus a backdrop in the screenshot), give Delete a distinct destructive style, default focus on Cancel, and annotate that Esc or Cancel returns focus to the row's Delete.
5. **Add the J1 inline-error state** "Title is required" to list A, with focus kept on the field and `aria-describedby`.
6. **Show the signed-in user and a Sign out control** on the list screen (J5).
7. **Use unique ids** for each state panel, and pick one word for the cancel action ("Cancel").
8. **Board:** stack or wrap the variant columns (`flex-wrap: wrap`) so variant C isn't off screen at 1280 px and rows don't scroll sideways at 390 px.
9. Low priority: add a one-line visual direction note for hi-fi.

Re-review after changes 1–8. If they land, accessibility, hierarchy and mobile fit should reach 7 or better.
