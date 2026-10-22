# Constitution (G0)

Draft by `/ai-sdlc:new-project`; you approve it once (gate G0). Agents read it before every stage.

## Purpose

A shared to-do app for a small team (2-10 users): create, assign, and track tasks on shared lists.

## Principles

- Keep it boring: CRUD on tasks and lists, nothing clever.
- Every user action a teammate didn't take is auditable (who created/completed/deleted what).
- Auth is the one place correctness can't be "mostly right" — it stays an always-human path.

## Stack

Next.js (App Router) + TypeScript, Postgres via Drizzle ORM, Vitest for unit/property tests, Playwright for E2E, npm.

## Non-negotiables

- No endpoint reads or writes another user's data without an authorization check.
- No secrets, tokens, or session identifiers in logs, errors, or analytics.
- Every acceptance criterion in a `spec.md` is covered by a test before merge.

## Definition of done

Tests first, all checks green, Playwright check for UI, stage report posted, acceptance criteria covered by tests.

## Hosting and data

Deployment profile: edge · web host: Vercel · database: Neon (Postgres) · region: closest to the team (default `us-east-1`, revisit if the team is India-based)

## Always-human paths

`**/auth/**`, `db/migrations/**`, `.github/workflows/**`, `.claude/**`, `.mcp.json`, `infra/**`, `scripts/deploy.sh`, `scripts/scan-agent-config*.sh`

## Gate profile and tracks

light (see CLAUDE.md section 8).

## Seed data

Locale: en-US, en-IN · currency: none (to-do app, no money) · time zones: UTC, IST (Asia/Kolkata)
Edge cases that matter: due-dates crossing midnight UTC vs. IST, daylight-saving-free zones (IST has none, keep one DST locale if timezone bugs matter later).

## Domain skills

None. Generic CRUD + auth is covered by the standard gates; revisit if sharing/permission logic grows non-trivial.
