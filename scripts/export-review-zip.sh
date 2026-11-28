#!/bin/bash
# Resolve the project root from this script's own location so the script keeps
# working if the project folder is renamed/moved (it was renamed to
# "/Users/tadii/Desktop/1. Mercenta" and the old hardcoded path became an empty
# stub). No hardcoded ~/Desktop/Mercenta path remains on purpose.
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"
mkdir -p "Review Zip"
rm -f "Review Zip/mercenta-review.zip"
# §34 (MANDATORY) — a credential must NEVER leave the machine inside a review ZIP.
# `zip` does not read .gitignore, so the gitignored environment files (which hold the
# live provider credentials) were previously included. They are excluded here, and
# the assertions below FAIL the export if any of them ever reappears.
#
# §Clean-slate reconciliation 2026-09-21 — the exclusion list now MIRRORS .gitignore,
# so "what is in the review ZIP" == "what is in the repository":
#   · generated artefacts (reproducible outputs, gitignored): test-screenshots/,
#     forensic-captures/, playwright-report/, test-results/, e2e-report/, Review Zip/
#   · personal / compliance documents the Founder keeps on disk but deliberately
#     does not track (Company Documents/, Partnerships/, Admin Accounts/, Random/)
# Including them made the ZIP carry hundreds of screenshots and the Founder's
# private PDFs. Both are on disk and reproducible; neither belongs in a code review.
zip -r "Review Zip/mercenta-review.zip" . \
  -x "node_modules/*" "*/node_modules/*" "dist/*" "build/*" ".git/*" \
  "Review Zip/*" "*.zip" \
  ".reference/*" ".skills/*" ".bugpatrol/*" \
  "test-screenshots/*" "forensic-captures/*" "playwright-report/*" \
  "test-results/*" "e2e-report/*" \
  "Admin Accounts/*" "Random/*" "Company Documents/*" "0. Company Documents/*" \
  "Parterships/*" "Partnerships/*" \
  ".env" ".env.*" "*.pem" "*.key" "*.p12" "*.pfx"

# §34 assertion — the only environment file allowed in the archive is `.env.example`.
LEAKS=$(unzip -Z1 "Review Zip/mercenta-review.zip" | grep -E '^\.env' | grep -v '^\.env\.example$' || true)
if [ -n "$LEAKS" ]; then
  echo "SECURITY FAIL — the review ZIP contains environment files:" >&2
  echo "$LEAKS" >&2
  rm -f "Review Zip/mercenta-review.zip"
  exit 1
fi
# §Clean-slate reconciliation 2026-09-21 — the same guard for every gitignored tree,
# so deleting an exclusion above can never silently leak a private document or
# re-flood the archive with generated screenshots.
EXCLUDED_TREES="test-screenshots/|forensic-captures/|playwright-report/|test-results/|e2e-report/|Admin Accounts/|Random/|Company Documents/|0\. Company Documents/|Parterships/|Partnerships/"
TREE_LEAKS=$(unzip -Z1 "Review Zip/mercenta-review.zip" | grep -E "^($EXCLUDED_TREES)" || true)
if [ -n "$TREE_LEAKS" ]; then
  echo "SECURITY FAIL — the review ZIP contains a gitignored tree that must never leave the machine:" >&2
  echo "$TREE_LEAKS" | head -20 >&2
  rm -f "Review Zip/mercenta-review.zip"
  exit 1
fi
echo "Credential guard: PASS — no .env file and no gitignored private/generated tree is inside the archive."
echo "Review zip: $(du -h 'Review Zip/mercenta-review.zip' | cut -f1) at $PROJECT_ROOT/Review Zip/mercenta-review.zip"
echo "Review zip: $(du -h 'Review Zip/mercenta-review.zip' | cut -f1) at $PROJECT_ROOT/Review Zip/mercenta-review.zip"