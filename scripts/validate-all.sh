#!/bin/bash
#
# §SSOT — THE WHOLE VALIDATOR CORPUS, IN ONE COMMAND.
#
# WHY THIS EXISTS
# ---------------
# The repository holds many more validators than it registers: `package.json`
# listed 36 `validate:*` scripts while `scripts/validate-*.mjs` held 113 files.
# A "whole sweep" that runs the registered subset therefore reports green while 77
# validators — including `validate-work-layer.mjs`, the owner gate of the layer the
# platform calls THE single action list — have never run at all. That is how a
# two-sources-of-truth defect in the work layer survived every reported sweep.
#
# This script runs EVERY file, reports a real total, and exits non-zero if any of
# them fails. `npm run validate:all` is now the standing close-out gate, and any
# report claiming a whole sweep must quote THIS number.
#
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

PASS=0
FAIL=0
FAILED=""
for f in scripts/validate-*.mjs; do
  OUT=$(node "$f" 2>&1)
  CODE=$?
  if [ "$CODE" -eq 0 ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    FAILED="$FAILED $(basename "$f" .mjs)"
    echo "FAIL  $(basename "$f" .mjs) (exit $CODE)"
    echo "$OUT" | grep -iE '✗|FAIL|Error:' | head -4 | sed 's/^/        /'
  fi
done

# ── §SSOT — THE REGISTERED VALIDATORS THE GLOB DOES NOT MATCH ───────────────
# The loop above runs every `scripts/validate-*.mjs` FILE. Two registered
# `validate:*` npm scripts are not matched by that glob:
#   validate:wording  ->  scripts/lint-wording.mjs  (a REAL outward-facing gate)
#   validate:all      ->  this script               (must never recurse)
# Until this block existed, `npm run validate:all` printed a whole-corpus green
# while the WORDING gate had never run — which is exactly the failure mode this
# file's own header describes. The list is DISCOVERED from package.json rather
# than retyped, so a future `validate:*` script cannot silently fall outside the
# sweep again. Measured when this was added: 2 of 44 registered validate:*
# scripts were unmatched, and one of them (`validate:wording`) is a real gate.
UNMATCHED=$(node -e 'const p=require("./package.json");for(const [k,v] of Object.entries(p.scripts)){if(k.startsWith("validate:")===false)continue;if(k==="validate:all")continue;const m=v.match(/scripts\/([A-Za-z0-9_.-]+\.mjs)/);if(m&&/^validate-/.test(m[1]))continue;console.log(k)}')
for name in $UNMATCHED; do
  OUT=$(npm run --silent "$name" 2>&1)
  CODE=$?
  if [ "$CODE" -eq 0 ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    FAILED="$FAILED $name"
    echo "FAIL  $name (exit $CODE)"
    echo "$OUT" | grep -iE '✗|FAIL|Error:' | head -4 | sed 's/^/        /'
  fi
done

echo "=================================="
echo "FULL VALIDATOR CORPUS: $PASS PASS / $FAIL FAIL (of $((PASS + FAIL)) validators: every scripts/validate-*.mjs file, plus every registered validate:* script the glob does not match)"
if [ -n "$FAILED" ]; then
  echo "FAILED:$FAILED"
fi
[ "$FAIL" -eq 0 ]
