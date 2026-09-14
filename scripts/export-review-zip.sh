#!/bin/bash
# Resolve the project root from this script's own location so the script keeps
# working if the project folder is renamed/moved (it was renamed to
# "/Users/tadii/Desktop/1. Mercenta" and the old hardcoded path became an empty
# stub). No hardcoded ~/Desktop/Mercenta path remains on purpose.
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"
mkdir -p "Review Zip"
rm -f "Review Zip/mercenta-review.zip"
zip -r "Review Zip/mercenta-review.zip" . \
  -x "node_modules/*" "dist/*" "build/*" ".git/*" \
  "Review Zip/*" "test-results/*" "*.zip" "playwright-report/*"
echo "Review zip: $(du -h 'Review Zip/mercenta-review.zip' | cut -f1) at $PROJECT_ROOT/Review Zip/mercenta-review.zip"