# 0001. App stack, database driver and dependencies

Story: #2

## Status

Proposed (needs owner approval at G2: it adds dependencies).

## Context

The repository has no application code. `docs/constitution.md` fixes the stack: Next.js (App Router) and TypeScript, Postgres through Drizzle ORM, Vitest, Playwright, npm, on Vercel and Neon. The deployment profile is edge. We need to pick the database driver and list the packages the first build PR will add.

## Decision

- One root npm package. The Next.js app lives in `apps/web`; shared pure logic lives in `packages/core` and is imported through a TypeScript path alias. No npm workspaces.
- Route handlers run on the Node runtime and use `pg` (node-postgres) against Neon's pooled connection string. Only the middleware runs at the edge, and it only verifies a cookie with Web Crypto.
- Dependencies to add:
  - runtime: `next`, `react`, `react-dom`, `drizzle-orm`, `pg`;
  - development: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/pg`, `drizzle-kit`, `tsx` (runs the seed script), `eslint`, `eslint-config-next`, `vitest`, `fast-check`, `@playwright/test`.
- Every package is pinned by `package-lock.json`, and CI's `npm audit --audit-level=high` stays on.

## Consequences

- The same driver and the same engine run locally, in CI and in production, so tests exercise real Postgres.
- Moving route handlers to the edge runtime later means swapping `pg` for Neon's serverless driver, confined to `db/client.ts`.
- Adding dependencies is an escalation point, so T1 and T3 stop for owner approval before they merge.
