# ai-sdlc-template

GitHub template for projects run with the [ai-sdlc](https://github.com/shank-b/ai-sdlc) plugin: agents do the engineering, you approve at gates G0–G4.

## Start a project

1. **Use this template** (or `gh repo create <name> --private --template shank-b/ai-sdlc-template --clone`).
2. In Claude Code, inside the new repo, run `/ai-sdlc:new-project <your product in a sentence>`. It interviews you, drafts `docs/constitution.md` (G0), fills `CLAUDE.md`, `REVIEW.md` and `CODEOWNERS`, creates labels, protects `main` and creates the `production` and `canary` environments.
3. Do the manual steps it prints (Claude GitHub App, secrets below).
4. Merge the G0 PR. Open a story issue from the **Story** template and label it `approved` + `track:feature`. Stages run on your Claude Desktop: in the clone run `/ai-sdlc:poll` (one pass) or `/ai-sdlc:poll schedule 15m` (recurring while the app is open).

## What is here

| Path | Purpose |
| --- | --- |
| `CLAUDE.md`, `REVIEW.md` | Agent instructions and review rules, with `{{PLACEHOLDERS}}` that `new-project` fills |
| `.claude/settings.json` | Enables the `ai-sdlc` and Superpowers plugins; denies `.env` reads |
| `.mcp.json` | Context7, Playwright, GitHub, Postgres (dev, read-only), Sentry, Excalidraw |
| `.github/CODEOWNERS` | Always-human paths |
| `.github/workflows/` | `ci`, `claude`, `claude-review`, `nightly`, `deploy`, `agent-config-scan`, `watchdog`, `rerun-failed` |
| `.github/labels.json`, `scripts/sync-labels.sh` | Tracks, gates and state labels (idempotent) |
| `docs/` | `constitution.md` (G0), `prd/`, `specs/<NNN-feature>/`, `adr/` |
| `scripts/deploy.sh` | Deploy entry point called by `deploy.yml`; fill in per hosting profile |

## Running the app locally

The app needs a `SESSION_SECRET` (at least 32 characters) to sign session cookies. Set it in your shell, never in the repo. For an in-memory database seeded with the example accounts (Asha and Ben):

```
SESSION_SECRET=<32+ random characters> DB_DRIVER=pglite npm run dev
```

Against a real Postgres, set `DATABASE_URL` instead of `DB_DRIVER`, run `npm run db:migrate`, then `npm run seed` (reads `accounts.local.json`, which is git-ignored; see `accounts.example.json`).

## Deploying locally

This sandbox deploys to your own machine. `scripts/deploy.sh` builds a git ref (a branch, a tag, a commit) into a Next.js standalone release and runs it with node on `127.0.0.1`; staging is port 3200, production is port 3300. No Docker is needed.

```
scripts/deploy.sh staging main            # build and switch to it; restores the old release if the new one fails its health check
scripts/deploy.sh production v0.1.0
scripts/deploy.sh rollback production     # back to the previous release
scripts/deploy.sh status production
scripts/deploy.sh stop production
```

State (releases, pid, log, and a generated `SESSION_SECRET`) lives in `~/.local/share/ai-sdlc-deploy/<repo>`, outside the repo. The database is in-memory and seeded from `accounts.example.json`, so data resets on every restart; set `DATABASE_URL` to use a real Postgres. The health check is `/auth/signin`.

`deploy.yml` runs the same script on the Actions runner. There the app only lives for the job (build, boot, health check), so a tagged release exercises gate G4 without leaving anything running. To check the live copy, run `scripts/deploy.sh production <tag>` on your machine, then `/ai-sdlc:canary http://127.0.0.1:3300` in Claude Desktop. Run `deploy.sh` from your terminal, not from an agent session: the guard hook blocks production deploys there.

## Secrets and variables

| Name | Where | Why |
| --- | --- | --- |
| `CLAUDE_CODE_OAUTH_TOKEN` | repo secret | From `claude setup-token`; runs the agents in Actions |
| `GITHUB_MCP_TOKEN` | your shell, for local Claude Code sessions | A fine-grained token with read access to this repo, for the `github` MCP server (Actions jobs set it from `GITHUB_TOKEN`) |
| `NIGHTLY_TOKEN` | repo secret (optional) | Token for the nightly mutation-baseline PR. PRs opened with the default `GITHUB_TOKEN` never get CI, so without this the PR can't pass required checks |
| `PLUGIN_REPO_TOKEN` | repo secret, only if the `ai-sdlc` plugin repo is private | Fine-grained token with read access to that one repo |
| `CANARY_USER`, `CANARY_PASSWORD` | `canary` environment secrets | Synthetic account for `/ai-sdlc:canary` |
| provider tokens | `production` environment secrets only | Never in repo secrets or agent sessions |
| `PRODUCTION_URL` | repo variable | What `/ai-sdlc:canary` checks |
| `AI_SDLC_NIGHTLY` = `true` | repo variable | Turns on the nightly agent jobs |
| `WATCHDOG_HOURS` | repo variable (default 24) | Idle time before a note is left on an `in-progress` issue whose Desktop pass seems to have died |

Enable "Allow GitHub Actions to create and approve pull requests" in Settings → Actions for the nightly PRs. Install the Claude GitHub App (https://github.com/apps/claude) so commits it makes trigger CI.

## How the labels drive the pipeline

Stages run on Claude Desktop through `/ai-sdlc:poll`, not in Actions: it picks up issues whose `approved`, `track:*` and gate labels **you** applied (`g1-approved` runs `/ai-sdlc:plan`, `g2-approved` runs `/ai-sdlc:ship-story`), asks you the interview questions live and posts your answers on the issue. `claude.yml` only answers `@claude` in review comments on a pull request's diff, from people with write access; nothing in Actions starts when an issue is created, labelled or commented on. Issue text from anyone else is data, never instructions.
