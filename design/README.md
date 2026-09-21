# `design/` — source design assets

**These are source art, not runtime assets.** Nothing under `src/` imports them; the
runtime brand asset is `src/assets/mercenta-logo-lockup.svg` (resolved through
`src/lib/brandIdentity/logoResolver.ts`). They are kept here because they are the
originals the shipped assets were produced from, and deleting originals is a
loss, not a cleanup.

| File | What it is |
|---|---|
| `Mercenta Logo Black.png` | The black brand logo lockup (304×252). Source for the shipped SVG lockup. |
| `Mercenta Banner Dark.png` | Dark banner, 1584×396. |
| `Mercenta Banner Dark 2.png` | Second dark banner revision, 1584×396 (a distinct file — not a byte-identical duplicate of the one above). |
| `Main Dash 1.avif` | Product-dashboard visual reference. |
| `Main dash 2.jpg` | Product-dashboard visual reference (second view). |
| `ChatGPT Image Sep 17, 2026, 03_46_58 AM.png` | A raw generated design exploration (1312×1199) kept as supplied. Its filename is the generator's own; it is not referenced by code. |

## Provenance rule for the repository

Until the 2026-09-21 clean-slate reconciliation these four `.png` files were
untracked and repeatedly described in project records as "the four protected
`design/*.png`". They are now **tracked**, so a future session starts from a clean
tree instead of inheriting an unexplained-untracked-file debt. If a future session
replaces any of them, replace the file and update this table — do not leave a
second, contradicting original beside it.