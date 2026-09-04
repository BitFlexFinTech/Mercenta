#!/bin/bash
cd ~/Desktop/Mercenta
mkdir -p "Review Zip"
rm -f "Review Zip/mercenta-review.zip"
zip -r "Review Zip/mercenta-review.zip" . \
  -x "node_modules/*" "dist/*" "build/*" ".git/*" \
  "Review Zip/*" "test-results/*" "*.zip" "playwright-report/*"
echo "Review zip: $(du -h 'Review Zip/mercenta-review.zip' | cut -f1) at ~/Desktop/Mercenta/Review Zip/mercenta-review.zip"