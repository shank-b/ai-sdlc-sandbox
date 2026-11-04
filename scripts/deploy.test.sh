#!/usr/bin/env bash
# scripts/deploy.sh against a throwaway repo and a fake npm (no real build): deploy, switch release, failed health check,
# rollback, stop, and bad input. Hermetic: own DEPLOY_HOME, a random port, nothing outside a temp dir.
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d); N=0; FAILS=0; LISTENER=
cleanup() { (cd "$T/repo" 2>/dev/null && PORT=$P DEPLOY_HOME=$T/home bash "$here/deploy.sh" stop staging >/dev/null 2>&1); [ -z "$LISTENER" ] || { kill "$LISTENER" 2>/dev/null; wait "$LISTENER" 2>/dev/null; }; rm -rf "$T"; }
trap cleanup EXIT
check() { N=$((N + 1)); local d=$1; shift; "$@" >/dev/null 2>&1 || { FAILS=$((FAILS + 1)); echo "FAIL: $d (RC=${RC:-} OUT=${OUT:-} ERR=${ERR:-})"; }; }
contains() { case $1 in *"$2"*) return 0 ;; esac; return 1; }
P=$((20000 + RANDOM % 20000)); export DEPLOY_HOME=$T/home DEPLOY_MIN_NODE=0 DEPLOY_HEALTH_TIMEOUT=10

# a repo with three commits: v1, v2, and one whose server dies on start (version FAIL)
R=$T/repo; mkdir -p "$R/db/migrations"; git -C "$R" init -q -b main
echo '{"accounts":["Asha","Ben"]}' >"$R/accounts.example.json"; echo 'select 1;' >"$R/db/migrations/0000.sql"
commit() { echo "$1" >"$R/version.txt"; git -C "$R" add -A; git -C "$R" -c user.name=t -c user.email=t@t commit -q -m "$1"; git -C "$R" tag "$1"; }
commit v1; commit v2; commit FAIL
sha() { git -C "$R" rev-parse --short=12 "$1"; }

# fake npm: `npm ci` does nothing; `npm run build` writes a standalone server that serves version.txt at /auth/signin,
# and dies if the files the real app reads from its working directory were not copied next to it
mkdir -p "$T/bin"; cat >"$T/bin/npm" <<'NPM'
#!/usr/bin/env bash
echo "$*" >>"$FAKE_LOG"
case "$1 $2" in
  "run build")
    mkdir -p apps/web/.next/standalone/apps/web apps/web/.next/static
    cp version.txt apps/web/.next/standalone/version.txt; echo static >apps/web/.next/static/x.txt
    cat >apps/web/.next/standalone/apps/web/server.js <<'JS'
const http = require("http"), fs = require("fs");
process.chdir(__dirname); // what Next's standalone server.js does: the app runs from apps/web
process.title = "next-server (v0)"; // and Next renames its process, so the command line never shows server.js
const v = fs.readFileSync("../../version.txt", "utf8").trim();
if (v === "FAIL" || !fs.existsSync("db/migrations/0000.sql") || !fs.existsSync("accounts.example.json")) process.exit(3);
http.createServer((q, r) => { if (q.url === "/auth/signin") r.end(v); else { r.statusCode = 404; r.end(); } }).listen(process.env.PORT, process.env.HOSTNAME);
JS
    ;;
esac
NPM
chmod +x "$T/bin/npm"; export FAKE_LOG=$T/npm.log PATH="$T/bin:$PATH"; : >"$FAKE_LOG"

dep() { OUT=$(cd "$R" && PORT=$P bash "$here/deploy.sh" "$@" 2>"$T/err"); RC=$?; ERR=$(cat "$T/err"); }
body() { curl -fsS --max-time 3 "http://127.0.0.1:$P/auth/signin" 2>/dev/null; }
dir=$DEPLOY_HOME/staging

dep staging v1
check "deploy v1: exit 0 and the app answers with v1" test "$RC" -eq 0 -a "$(body)" = v1
check "the release is named by the commit" test -d "$dir/releases/$(sha v1)"
check "the files the app reads at run time are in apps/web, its working directory" test -f "$dir/releases/$(sha v1)/apps/web/db/migrations/0000.sql" -a -f "$dir/releases/$(sha v1)/apps/web/accounts.example.json" -a -f "$dir/releases/$(sha v1)/apps/web/.next/static/x.txt"
check "current points at v1, nothing is previous yet" test "$(cat "$dir/current.sha")" = "$(sha v1)" -a ! -e "$dir/previous.sha"
check "the secret file is private (mode 600)" test "$(ls -l "$DEPLOY_HOME/session-secret" | cut -c1-10)" = "-rw-------"
check "the secret is never printed" test -z "$(printf '%s\n%s' "$OUT" "$ERR" | grep -F "$(cat "$DEPLOY_HOME/session-secret")")"
dep status staging; check "status: running and answering" contains "$OUT" "answering at http://127.0.0.1:$P"

dep staging v2
check "deploy v2: the app now answers with v2" test "$RC" -eq 0 -a "$(body)" = v2
check "v1 became the previous release" test "$(cat "$dir/previous.sha")" = "$(sha v1)" -a "$(cat "$dir/current.sha")" = "$(sha v2)"
builds=$(grep -c '^run build' "$FAKE_LOG"); dep staging v2
check "deploying the same commit again does not rebuild it" test "$RC" -eq 0 -a "$(grep -c '^run build' "$FAKE_LOG")" = "$builds" -a "$(body)" = v2

dep staging FAIL
check "a release that dies on start: exit 1 and says so" test "$RC" -eq 1 && contains "$ERR" "exited while starting"
check "…and the old release is serving again" test "$(body)" = v2 -a "$(cat "$dir/current.sha")" = "$(sha v2)"
check "…and previous is untouched" test "$(cat "$dir/previous.sha")" = "$(sha v1)"
check "…and the broken release is not kept for a retry to reuse" test ! -e "$dir/releases/$(sha FAIL)"

dep rollback staging
check "rollback: v1 answers again" test "$RC" -eq 0 -a "$(body)" = v1
check "rollback swapped current and previous" test "$(cat "$dir/current.sha")" = "$(sha v1)" -a "$(cat "$dir/previous.sha")" = "$(sha v2)"

dep stop staging
check "stop: nothing answers" test "$RC" -eq 0 && ! body
dep status staging; check "status after stop: not running" contains "$OUT" "not running"

# bad input and refusals
dep bogus x;                check "unknown command: exit 2" test "$RC" -eq 2
dep staging 'a;b';          check "a ref with shell characters: exit 2" test "$RC" -eq 2
dep staging no-such-ref;    check "an unknown ref: exit 1" test "$RC" -eq 1 && contains "$ERR" "cannot resolve"
dep rollback production;    check "rollback with no previous release: exit 1" test "$RC" -eq 1 && contains "$ERR" "no previous release"
OUT=$(cd "$R" && PORT=abc bash "$here/deploy.sh" staging v1 2>&1); RC=$?; check "a non-numeric PORT: exit 2" test "$RC" -eq 2
OUT=$(cd "$R" && DEPLOY_MIN_NODE=999 PORT=$P bash "$here/deploy.sh" staging v1 2>&1); RC=$?
check "too old a Node: exit 1 with a message" test "$RC" -eq 1 && contains "$OUT" "needs Node 999+"

# something else already on the port: refuse instead of health-checking the wrong server
P2=$((P + 1)); node -e 'require("http").createServer((q,r)=>r.end("other")).listen(+process.argv[1],"127.0.0.1")' "$P2" & LISTENER=$!
for _ in 1 2 3 4 5; do bash -c ": </dev/tcp/127.0.0.1/$P2" 2>/dev/null && break; sleep 0.3; done
OUT=$(cd "$R" && PORT=$P2 bash "$here/deploy.sh" staging v1 2>&1); RC=$?
check "port taken by another process: exit 1, does not claim success" test "$RC" -eq 1 && contains "$OUT" "already in use"

echo "deploy.test.sh: $((N - FAILS))/$N ok"; [ $FAILS = 0 ]
