#!/bin/bash
# §DEV SERVER HOUSEKEEPING (2026-11-21) — free this project's dev port.
#
# WHY THIS EXISTS. The owner ran `npm run dev` and got
#
#     Error: Port 5182 is already in use
#
# twice, because a session left a development server running in the BACKGROUND.
# The error is the project behaving correctly — `strictPort: true` refuses to slide
# to another port on purpose (see the global rule `unique-dev-port-per-project.md`:
# silently sliding is how you end up looking at a DIFFERENT project's page without
# knowing). The problem was the stray process, not the setting.
#
# This script kills ONLY a server belonging to THIS project: it matches the
# listening process's command line against this repository's own path, so another
# project's dev server on another port is never touched.
#
# Usage:  npm run dev:stop        (or  bash scripts/dev-stop.sh)
set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${DEV_PORT:-5182}"

pids="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)"
if [ -z "$pids" ]; then
  echo "dev:stop — port $PORT is already free (nothing is listening)."
  exit 0
fi

killed=0
for pid in $pids; do
  cmd="$(ps -o command= -p "$pid" 2>/dev/null || true)"
  case "$cmd" in
    *"$PROJECT_ROOT"*)
      echo "dev:stop — stopping this project's dev server (pid $pid)"
      kill "$pid" 2>/dev/null && killed=1
      ;;
    *)
      echo "dev:stop — NOT touching pid $pid on port $PORT: it belongs to another project"
      echo "           ($cmd)"
      ;;
  esac
done

sleep 2
if [ "$killed" = "1" ]; then
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "dev:stop — pid did not exit; forcing it"
    for pid in $pids; do kill -9 "$pid" 2>/dev/null || true; done
    sleep 1
  fi
fi

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "dev:stop — port $PORT is STILL in use:"
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN
  exit 1
fi
echo "dev:stop — port $PORT is FREE. \`npm run dev\` will start cleanly."
