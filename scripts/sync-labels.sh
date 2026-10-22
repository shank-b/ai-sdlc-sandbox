#!/usr/bin/env bash
# Create or update the labels in .github/labels.json (idempotent). Usage: scripts/sync-labels.sh [owner/repo]
set -euo pipefail
cd "$(dirname "$0")/.."
repo=${1:-}
jq -c '.[]' .github/labels.json | while IFS= read -r l; do
  name=$(jq -r .name <<<"$l"); color=$(jq -r .color <<<"$l"); desc=$(jq -r .description <<<"$l")
  gh label create "$name" --color "$color" --description "$desc" --force ${repo:+--repo "$repo"} >/dev/null
  echo "label: $name"
done
