#!/usr/bin/env bash
# AC6.6 (ignore half): the real seed file stays out of git, the example file does not.
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "FAIL: $1" >&2; exit 1; }

git check-ignore -q accounts.local.json || fail "accounts.local.json is not git-ignored"
if git check-ignore -q accounts.example.json; then fail "accounts.example.json must not be git-ignored"; fi
echo "ok: seed file ignore rules"
