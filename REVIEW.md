# Review rules

Flag, ranked Critical / Major / Minor (Critical blocks the merge):

- Correctness bugs that break production, and missing edge cases.
- Authorisation missing on any endpoint or action; broken access control.
- Token, session and secret handling; secrets in code, logs or config.
- Personal data in logs, errors or analytics.
- Acceptance criteria in `docs/specs/<NNN>/spec.md` without a test, and tests that do not assert behaviour (no assertion, asserting a mock, always-true).
- Changes to always-human paths without the task listing them.
- A new dependency that the plan did not name.

Out of scope: formatting, naming style, anything a linter already enforces.

## Project-specific risks

- Auth: any task/list endpoint must check the requesting user owns or is a member of the list before reading or writing it.
- Multi-user data: a to-do item or list must never leak across teams/users in list/search responses.
