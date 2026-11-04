#!/usr/bin/env bash
# Localhost deploy for this sandbox. No Docker, no cloud: it builds a git ref's Next.js standalone output and runs it with node
# on 127.0.0.1, so release, rollback and canary can be rehearsed end to end.
#   scripts/deploy.sh <staging|production> <git-ref>   build the ref, switch to it, health-check it (restores the old one if it fails)
#   scripts/deploy.sh rollback <staging|production>    switch back to the previous release
#   scripts/deploy.sh status   <staging|production>    which ref is live, and whether it answers
#   scripts/deploy.sh stop     <staging|production>
# Called by .github/workflows/deploy.yml as `deploy.sh <env> <ref>`. On a runner the app only lives for the job (a rehearsal:
# build, boot, health check). On your machine it keeps running at http://127.0.0.1:3200 (staging) or :3300 (production).
# Production deploys in the pipeline run after the owner approves the protected `production` environment (gate G4), which sets
# AI_SDLC_DEPLOY=1 for the guard hook; run it from your own terminal, not from an agent session.
# State lives outside the repo in $DEPLOY_HOME (default ~/.local/share/ai-sdlc-deploy/<repo>): releases/<sha>, current and
# previous links, pid, log, and a generated SESSION_SECRET (mode 600, never printed). The database is in-memory PGlite seeded
# from accounts.example.json, so data resets on every restart; set DATABASE_URL to use a real Postgres instead.
# Env: PORT (override the port), DEPLOY_HOME, DEPLOY_MIN_NODE (default 24), DEPLOY_HEALTH_TIMEOUT (seconds, default 90).
set -euo pipefail

usage() { echo "usage: deploy.sh <staging|production> <git-ref> | rollback|status|stop <staging|production>" >&2; exit 2; }
[ $# -ge 2 ] || usage
cmd=$1
case $cmd in
  staging|production) env=$cmd; ref=$2; cmd=deploy ;;
  rollback|status|stop) env=$2; ref= ;;
  *) usage ;;
esac
case $env in staging|production) ;; *) usage ;; esac
[[ -z $ref || $ref =~ ^[A-Za-z0-9._/@-]+$ ]] || { echo "deploy.sh: bad ref '$ref'" >&2; exit 2; }

root=$(git rev-parse --show-toplevel)
home=${DEPLOY_HOME:-$HOME/.local/share/ai-sdlc-deploy/$(basename "$root")}
dir=$home/$env
case $env in staging) default_port=3200 ;; production) default_port=3300 ;; esac
port=${PORT:-$default_port}
[[ $port =~ ^[0-9]+$ ]] || { echo "deploy.sh: bad PORT '$port'" >&2; exit 2; }
url=http://127.0.0.1:$port
mkdir -p "$dir/releases"

# Next renames its process ("next-server (v16...)"), so the command line cannot identify it. The start time saved next to the
# pid does: a recycled pid after a reboot has a different start time, so we never kill an unrelated process.
alive() { [ -f "$dir/pid" ] && kill -0 "$(cat "$dir/pid")" 2>/dev/null && [ "$(ps -p "$(cat "$dir/pid")" -o lstart= 2>/dev/null)" = "$(cat "$dir/pid.start" 2>/dev/null)" ]; }
healthy() { curl -fsS -o /dev/null --max-time 3 "$url/auth/signin" 2>/dev/null; }
port_in_use() { bash -c ": </dev/tcp/127.0.0.1/$port" 2>/dev/null; }

stop_app() {
  alive || { rm -f "$dir/pid"; return 0; }
  local pid; pid=$(cat "$dir/pid"); kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 50); do kill -0 "$pid" 2>/dev/null || break; sleep 0.2; done
  kill -9 "$pid" 2>/dev/null || true
  rm -f "$dir/pid" "$dir/pid.start"
}

secret() {
  if [ -n "${SESSION_SECRET:-}" ]; then printf '%s' "$SESSION_SECRET"; return; fi
  if [ ! -f "$home/session-secret" ]; then
    mkdir -p "$home"; ( umask 077; openssl rand -hex 32 >"$home/session-secret" )
  fi
  cat "$home/session-secret"
}

# start_release <release dir>: run it in the background and wait until it answers; 1 if it never does
start_release() {
  local rel=$1 pid timeout=${DEPLOY_HEALTH_TIMEOUT:-90}
  port_in_use && { echo "deploy.sh: port $port is already in use by something that is not this app" >&2; return 1; }
  local db=(DB_DRIVER=pglite); [ -z "${DATABASE_URL:-}" ] || db=(DATABASE_URL="$DATABASE_URL")
  # the braces keep `&` on the node command alone, so $! is node's pid (not a wrapper subshell's)
  ( cd "$rel" && { env NODE_ENV=production HOSTNAME=127.0.0.1 PORT="$port" SESSION_SECRET="$(secret)" "${db[@]}" \
      nohup node apps/web/server.js >>"$dir/app.log" 2>&1 & echo $! >"$dir/pid"; } )
  pid=$(cat "$dir/pid"); ps -p "$pid" -o lstart= >"$dir/pid.start" 2>/dev/null || true
  for _ in $(seq 1 "$timeout"); do
    kill -0 "$pid" 2>/dev/null || { echo "deploy.sh: the app exited while starting; last log lines:" >&2; tail -n 15 "$dir/app.log" >&2; rm -f "$dir/pid"; return 1; }
    healthy && return 0
    sleep 1
  done
  echo "deploy.sh: no answer from $url/auth/signin after ${timeout}s; last log lines:" >&2; tail -n 15 "$dir/app.log" >&2
  stop_app; return 1
}

point() { ln -sfn "$2" "$dir/$1"; basename "$2" >"$dir/$1.sha"; }

case $cmd in
  deploy)
    major=$(node -p 'process.versions.node.split(".")[0]')
    [ "$major" -ge "${DEPLOY_MIN_NODE:-24}" ] || { echo "deploy.sh: needs Node ${DEPLOY_MIN_NODE:-24}+, found $(node --version)" >&2; exit 1; }
    sha=$(git -C "$root" rev-parse --verify "$ref^{commit}") || { echo "deploy.sh: cannot resolve ref '$ref'" >&2; exit 1; }
    rel=$dir/releases/${sha:0:12}
    if [ ! -d "$rel" ]; then
      src=$(mktemp -d); trap 'rm -rf "$src"' EXIT
      git -C "$root" archive "$sha" | tar -x -C "$src"
      ( cd "$src" && npm ci --no-audit --no-fund && npm run build )
      build=$rel.partial; mkdir -p "$build"
      cp -R "$src/apps/web/.next/standalone/." "$build/"
      mkdir -p "$build/apps/web/.next"; cp -R "$src/apps/web/.next/static" "$build/apps/web/.next/static"
      [ ! -d "$src/apps/web/public" ] || cp -R "$src/apps/web/public" "$build/apps/web/public"
      # The standalone server.js does process.chdir(__dirname), so the app runs from apps/web and looks for the migrations
      # (db/migrations) and the in-memory database's seed accounts (accounts.example.json) there. The Dockerfile copies neither.
      mkdir -p "$build/apps/web/db"; cp -R "$src/db/migrations" "$build/apps/web/db/migrations"
      cp "$src/accounts.example.json" "$build/apps/web/accounts.example.json"
      mv "$build" "$rel"; built=1
    fi
    old=; [ -L "$dir/current" ] && old=$(cat "$dir/current.sha")
    stop_app
    if start_release "$rel"; then
      # redeploying the commit that is already live must not make "previous" point at itself
      [ -z "$old" ] || [ "$old" = "${sha:0:12}" ] || point previous "$dir/releases/$old"
      point current "$rel"
      echo "deployed $ref (${sha:0:12}) to $env at $url"
    else
      # a release that never came up is not kept, so a retry rebuilds it instead of reusing the broken one
      [ "${built:-}" != 1 ] || rm -rf "$rel"
      if [ -n "$old" ] && start_release "$dir/releases/$old"; then echo "deploy.sh: $ref failed its health check; $old is serving again" >&2
      else echo "deploy.sh: $ref failed its health check and nothing is running" >&2; fi
      exit 1
    fi ;;
  rollback)
    [ -L "$dir/previous" ] || { echo "deploy.sh: no previous release of $env to roll back to" >&2; exit 1; }
    prev=$(cat "$dir/previous.sha"); cur=; [ -L "$dir/current" ] && cur=$(cat "$dir/current.sha")
    stop_app
    start_release "$dir/releases/$prev" || { echo "deploy.sh: the previous release did not start" >&2; exit 1; }
    [ -z "$cur" ] || point previous "$dir/releases/$cur"
    point current "$dir/releases/$prev"
    echo "rolled $env back to $prev at $url" ;;
  status)
    if [ -L "$dir/current" ]; then
      echo "$env: release $(cat "$dir/current.sha")$(alive && echo ", running (pid $(cat "$dir/pid"))" || echo ", not running")$(healthy && echo ", answering at $url" || echo ", not answering at $url")"
    else echo "$env: nothing deployed yet"; fi ;;
  stop) stop_app; echo "$env stopped" ;;
esac
