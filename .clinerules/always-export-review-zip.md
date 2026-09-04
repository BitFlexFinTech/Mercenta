---
# Review Zip Rule

After completing a task, create a zip of the project for review.

Rules:
- Save location: ~/Desktop/Mercenta/Review Zip/mercenta-review.zip
- Create the "Review Zip" folder if it doesn't exist:
  mkdir -p ~/Desktop/Mercenta/Review\ Zip/
- Overwrite the existing zip each time (do NOT create numbered zips)
- Exclude from the zip:
  - node_modules/
  - dist/
  - build/
  - .git/
  - Review Zip/
  - test-results/
- Use:
  zip -r ~/Desktop/Mercenta/Review\ Zip/mercenta-review.zip . \
    -x "node_modules/*" "dist/*" "build/*" ".git/*" "Review Zip/*" "test-results/*"
- Do NOT save the zip anywhere else.
---
