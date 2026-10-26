# 0004. Accounts come from a local, git-ignored seed file

Story: #2

## Status

Proposed (touches auth; owner's decision recorded on PR #14).

## Context

The owner decided that sign-in accounts are set up in a local seed file that is not pushed to git. The sign-in screen needs a list of accounts, and items need a foreign key to a user.

## Decision

- The owner writes accounts into `accounts.local.json` at the repository root. The file is listed in `.gitignore`. It holds a list of display names only (spec open question 10).
- `accounts.example.json` is committed. It contains made-up names (Asha and Ben) and shows the format.
- `npm run seed` reads `accounts.local.json` (a missing file seeds nothing), then inserts any names not yet in `users`. It never deletes users. In tests and end-to-end runs the in-memory database is seeded from `accounts.example.json` at server start-up, so CI needs no seed file.
- The running app reads only the `users` table. It never reads the file.
- The file holds no passwords or PINs, so there is nothing secret to log.

## Consequences

- No account data reaches the repository. A test checks the ignore rule and the example file (AC6.6).
- Removing a name from the file doesn't remove the user; the owner deletes the row by hand. Acceptable for a dev-only sign-in.
- With no seed file or no users, the sign-in screen shows "No accounts set up. Add accounts to your local seed file." (AC6.5).
- Production accounts are seeded from the owner's machine against the Neon database. A real-auth story replaces this before real users arrive.
