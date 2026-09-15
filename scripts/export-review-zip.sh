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
# the assertion below FAILS the export if any environment file ever reappears.
zip -r "Review Zip/mercenta-review.zip" . \
  -x "node_modules/*" "dist/*" "build/*" ".git/*" \
  "Review Zip/*" "test-results/*" "*.zip" "playwright-report/*" \
  "Admin Accounts/*" "Random/*" \
  ".env" ".env.*" "!.env.example" "*.pem" "*.key" "*.p12" "*.pfx"

# §34 assertion — the only environment file allowed in the archive is `.env.example`.
LEAKS=$(unzip -Z1 "Review Zip/mercenta-review.zip" | grep -E '^\.env' | grep -v '^\.env\.example$' || true)
if [ -n "$LEAKS" ]; then
  echo "SECURITY FAIL — the review ZIP contains environment files:" >&2
  echo "$LEAKS" >&2
  rm -f "Review Zip/mercenta-review.zip"
  exit 1
fi
echo "Credential guard: PASS — the review ZIP contains NO .env file of any kind (the template .env.example is excluded too, deliberately)."
echo "Review zip: $(du -h 'Review Zip/mercenta-review.zip' | cut -f1) at $PROJECT_ROOT/Review Zip/mercenta-review.zip"