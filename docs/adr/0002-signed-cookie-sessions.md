# 0002. Signed-cookie sessions

Story: #2

## Status

Proposed (always-human path: auth).

## Context

The spec needs a minimal sign-in that picks an account (US6) and a session that every item request is checked against (AC5.3, AC5.4). The sign-in is dev-only; real authentication is a later story (spec open question 2). The deployment profile is edge, so the check must run in middleware where only Web Crypto is available.

## Decision

A stateless cookie `<userId>.<expiry>.<signature>`, where the signature is HMAC-SHA-256 over the first two parts with `SESSION_SECRET`. The cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production and lasts 7 days. Mutating routes also check that the `Origin` header matches the host. Sign-out clears the cookie. `SESSION_SECRET` is an environment variable; it is never committed, logged or read from `.env*` by agents.

Rejected: a `sessions` table with random tokens. It allows server-side revoke, but costs a table and a lookup on every request, and the sign-in is throwaway.

## Consequences

- No extra dependency and no extra table.
- A stolen cookie can't be revoked before it expires. Accepted for a dev-only sign-in; the real-auth story replaces this.
- Rotating `SESSION_SECRET` signs everyone out.
- All of this code lives under `auth/` directories, so CODEOWNERS routes it to the owner.
