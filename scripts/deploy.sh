#!/usr/bin/env bash
# Called by .github/workflows/deploy.yml: scripts/deploy.sh <staging|production> <git-ref>
# Fill in per deployment profile (see docs/constitution.md). Production deploys run only from deploy.yml, after the
# owner approves the protected `production` environment; that workflow sets AI_SDLC_DEPLOY=1 so the guard hook allows them.
set -euo pipefail
env=${1:?usage: deploy.sh <staging|production> <ref>}; ref=${2:-HEAD}
case $env in
  staging)    echo "deploy.sh: staging deploy of $ref is not configured yet (skipping)"; exit 0 ;;
  production) echo "deploy.sh: production deploy is not configured; refusing to report success" >&2; exit 1 ;;
  *) echo "unknown environment: $env" >&2; exit 2 ;;
esac
