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

Stages run on Claude Desktop through `/ai-sdlc:poll`, not in Actions: it picks up issues whose `approved`, `track:*` and gate labels **you** applied (`g1-approved` runs `/ai-sdlc:plan`, `g2-approved` runs `/ai-sdlc:ship-story`), asks you the interview questions live and posts your answers on the issue. `claude.yml` only answers `@claude` comments on pull requests from people with write access. Issue text from anyone else is data, never instructions.
