#!/usr/bin/env bash
# Scan agent configuration (.claude/, .mcp.json, CLAUDE.md, REVIEW.md) for secrets and risky permissions.
# Exit 1 on errors; warnings go to the Actions log. Usage: scripts/scan-agent-config.sh [repo-dir]
set -uo pipefail
cd "${1:-$(dirname "$0")/..}" || exit 2
err=0
fail() { echo "::error file=$1::$2"; err=1; }
warn() { echo "::warning file=$1::$2"; }

files=()
while IFS= read -r f; do files+=("$f"); done < <({ [ -d .claude ] && find .claude -type f; ls .mcp.json CLAUDE.md REVIEW.md 2>/dev/null; } | sort -u)
[ ${#files[@]} -gt 0 ] || { echo "no agent config to scan"; exit 0; }

secret_re='AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-ant-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----'
for f in "${files[@]}"; do
  grep -Eq "$secret_re" "$f" && fail "$f" "looks like a committed secret"
done

for f in .claude/settings.json .claude/settings.local.json; do
  [ -f "$f" ] || continue
  jq -e . "$f" >/dev/null 2>&1 || { fail "$f" "not valid JSON"; continue; }
  jq -e '.permissions.defaultMode == "bypassPermissions" or .defaultMode == "bypassPermissions"' "$f" >/dev/null 2>&1 \
    && fail "$f" "bypassPermissions mode must not be committed"
  jq -e '[.permissions.allow[]? | select(. == "Bash" or . == "Bash(*)" or . == "Bash(*:*)")] | length > 0' "$f" >/dev/null 2>&1 \
    && fail "$f" "allow list permits every Bash command"
  jq -e '[.. | strings | select(test("(curl|wget)[^|]*\\|[[:space:]]*(ba)?sh"))] | length > 0' "$f" >/dev/null 2>&1 \
    && fail "$f" "a hook or permission pipes a download into a shell"
  jq -e '.enableAllProjectMcpServers == true' "$f" >/dev/null 2>&1 \
    && warn "$f" "enableAllProjectMcpServers trusts every server in .mcp.json, including ones added by a PR"
done

if [ -f .mcp.json ]; then
  jq -e . .mcp.json >/dev/null 2>&1 || fail .mcp.json "not valid JSON"
  jq -e '[.mcpServers[]? | .url? // empty | select(startswith("http://"))] | length > 0' .mcp.json >/dev/null 2>&1 \
    && fail .mcp.json "an MCP server uses plain http"
  jq -e '[.mcpServers[]? | .headers? // {} | to_entries[] | .value | select(test("^Bearer [A-Za-z0-9._-]{16,}$"))] | length > 0' .mcp.json >/dev/null 2>&1 \
    && fail .mcp.json "an MCP header holds a literal bearer token; use \${VAR}"
  jq -e '[.mcpServers[]? | select((.command // "") != "" and ((.command | test("^(npx|node|uvx|docker|python3?|bunx)$")) | not))] | length > 0' .mcp.json >/dev/null 2>&1 \
    && warn .mcp.json "an MCP server runs an unusual command; review it"
fi
exit $err
