# 0003. To-do data model and per-user scoping

Story: #2

## Status

Proposed (data-model change; the migration is an always-human path).

## Context

Items must persist, belong to exactly one user, be ordered open-first, and never be visible to another user (spec US4, US5). The constitution says no endpoint may read or write another user's data without an authorization check.

## Decision

- Tables: `users(id, name unique)` and `todos(id, user_id → users, title, completed_at, created_at)`. The title has a database check of 1 to 140 characters. Completion is a nullable `completed_at` timestamp, not a boolean, so one column holds the state and the order of completed items. Timestamps are stored in UTC.
- Index `todos_user_idx` on `(user_id, completed_at, created_at desc)`.
- Only `apps/web/src/data` queries `todos`. Each function takes `userId` as a required argument and filters on it in every statement. Updates and deletes use `WHERE id = $1 AND user_id = $2`; zero rows affected is reported as "not found" (HTTP 404), the same as an id that doesn't exist, so the API doesn't reveal that another user's item exists.
- Delete is a hard delete with `on delete cascade` from users.

## Consequences

- A forgotten filter is the main risk. It is covered by property tests over generated users and items (AC5.2) and HTTP-level tests (AC5.3).
- No audit trail and no soft delete; both are out of scope here (spec open question 5) and would need a later migration.
- The migration only adds tables, so rollback is dropping them.
