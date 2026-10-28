# 0001. App stack, database driver and dependencies

Story: #2

## Status

Accepted (owner approved the dependency list at G2 and the T3 migration and dependencies in PR #23).

## Context

The repository has no application code. `docs/constitution.md` fixes the stack: Next.js (App Router) and TypeScript, Postgres through Drizzle ORM, Vitest, Playwright, npm, on Vercel and Neon. The deployment profile is edge. We need to pick the database driver and list the packages the first build PR will add.

## Decision

- One root npm package. The Next.js app lives in `apps/web`; shared pure logic lives in `packages/core` and is imported through a TypeScript path alias. No npm workspaces.
- Route handlers run on the Node runtime and use `pg` (node-postgres) against Neon's pooled connection string. Only the middleware runs at the edge, and it only verifies a cookie with Web Crypto.
- Tests and CI use in-memory PGlite (real Postgres compiled to WASM) instead of a Postgres container, which keeps `ci.yml` untouched. `db/client.ts` picks PGlite when `DB_DRIVER=pglite` and `pg` otherwise. A smoke test against real Postgres runs locally when `DATABASE_URL` is set.
- Portable deploys: `apps/web/next.config.mjs` sets `output: 'standalone'` and the repository carries a small `Dockerfile` and `.dockerignore`, so any container host (Render, Cloud Run, Koyeb, Railway and similar) can run the app. Vercel keeps working with no changes. The only per-host configuration is two environment variables, `DATABASE_URL` and `SESSION_SECRET`. Any Postgres host works through `DATABASE_URL` (Neon, Supabase and others).
- Security headers are set in `apps/web/next.config.mjs` for every response: a Content-Security-Policy (`default-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `connect-src 'self'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY` and a `Permissions-Policy` that turns off camera, microphone and geolocation. Ceiling: the policy allows inline scripts and styles (`'unsafe-inline'`) because Next injects them. Tightening it to a per-request nonce needs the middleware, which is an always-human path, so that is a follow-up.
- No `tsx`: the seed command runs with Node's built-in TypeScript stripping (`node --experimental-strip-types`, Node 22.6 or later), so `db/seed.ts` and the files it imports use explicit `.ts` import extensions and plain syntax. This keeps one dependency out.
- Dependencies to add:
  - runtime: `next`, `react`, `react-dom`, `drizzle-orm`, `pg`;
  - development: `@electric-sql/pglite`, `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/pg`, `drizzle-kit`, `eslint`, `eslint-config-next`, `vitest`, `fast-check`, `@playwright/test`.
- Every package is pinned by `package-lock.json`, and CI's `npm audit --audit-level=high` stays on.

## Consequences

- Tests run on real Postgres semantics with no setup, but through a different driver than production. CI never exercises the `pg` connection setup, so the local smoke test is the only check before the first deploy.
- Moving route handlers to the edge runtime later means swapping `pg` for Neon's serverless driver, confined to `db/client.ts`.
- The container image isn't built in CI (that would need a `ci.yml` edit). The Dockerfile is checked by a local `docker build` and run before the first deploy.
- Considered and not chosen: a lighter server framework (Hono or Express), SvelteKit or Astro, and SQLite or libSQL. Each is lighter, but each means changing the constitution (G0), which is the owner's decision. Revisit if the app outgrows free-tier limits or cold starts hurt.
- Adding dependencies is an escalation point, so T1 and T3 stop for owner approval before they merge.
