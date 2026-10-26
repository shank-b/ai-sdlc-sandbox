# 0001. App stack, database driver and dependencies

Story: #2

## Status

Proposed (needs owner approval at G2: it adds dependencies).

## Context

The repository has no application code. `docs/constitution.md` fixes the stack: Next.js (App Router) and TypeScript, Postgres through Drizzle ORM, Vitest, Playwright, npm, on Vercel and Neon. The deployment profile is edge. We need to pick the database driver and list the packages the first build PR will add.

## Decision

- One root npm package. The Next.js app lives in `apps/web`; shared pure logic lives in `packages/core` and is imported through a TypeScript path alias. No npm workspaces.
- Route handlers run on the Node runtime and use `pg` (node-postgres) against Neon's pooled connection string. Only the middleware runs at the edge, and it only verifies a cookie with Web Crypto.
- Tests and CI use in-memory PGlite (real Postgres compiled to WASM) instead of a Postgres container, which keeps `ci.yml` untouched. `db/client.ts` picks PGlite when `DB_DRIVER=pglite` and `pg` otherwise. A smoke test against real Postgres runs locally when `DATABASE_URL` is set.
- Dependencies to add:
  - runtime: `next`, `react`, `react-dom`, `drizzle-orm`, `pg`;
  - development: `@electric-sql/pglite`, `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/pg`, `drizzle-kit`, `tsx` (runs the seed script), `eslint`, `eslint-config-next`, `vitest`, `fast-check`, `@playwright/test`.
- Every package is pinned by `package-lock.json`, and CI's `npm audit --audit-level=high` stays on.

## Consequences

- Tests run on real Postgres semantics with no setup, but through a different driver than production. CI never exercises the `pg` connection setup, so the local smoke test is the only check before the first deploy.
- Moving route handlers to the edge runtime later means swapping `pg` for Neon's serverless driver, confined to `db/client.ts`.
- Adding dependencies is an escalation point, so T1 and T3 stop for owner approval before they merge.
