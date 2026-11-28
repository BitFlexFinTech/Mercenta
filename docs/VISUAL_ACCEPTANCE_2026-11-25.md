# §BATCH 8 — THE FULL VISUAL ACCEPTANCE PASS (2026-11-28)

> **THIS IS A GENERATED RECORD, AND IT IS PINNED.** The table below is written by
> `node scripts/visual-acceptance.mjs`, which walks every screen the product declares in BOTH
> appearances in a real Chromium browser. `scripts/validate-visual-acceptance.mjs` re-derives the
> same inventory from the same declarations and FAILS if this record stops covering a screen — so
> it cannot go stale, and it cannot quietly claim a screen it never walked. Only the
> `WHAT THE PASS FOUND` section below is written by hand.
>
> **THE TITLE DATE IS THE DATE OF THE PASS THAT PRODUCED THIS TABLE, NOT A HISTORICAL LABEL**
> — it is generated on every run, so it always names the pass the table came from. The FILE NAME
> keeps its original `2026-11-25` because the path is pinned by
> `scripts/validate-visual-acceptance.mjs`; the content is always the LATEST pass, never an
> archive. **No sentence in this banner may carry a hand-written date** — one did (§BATCH 4b,
> 2026-11-28: a parenthetical still said the table had been regenerated on 2026-11-27, so the
> banner contradicted its own generated title), and it was removed rather than re-dated, because
> a hand-maintained date inside a generated file goes stale on the very next run.

## HOW THE PASS WAS RUN

- Inventory discovered from: `src/components/layout/AdminShell.tsx` · `src/components/layout/BrandShell.tsx` · `src/next/navConfig.ts` · `src/lib/seo/publicRoutes.ts`
- Appearances: **brand-dark** (`#000000` page fill) and **brand-light** (`#FFFFFF` page fill) — the two the app allows.
- Browser: headless Chromium at 1440×900, `prefers-reduced-motion: reduce`, so a capture cannot depend on smooth scrolling.
- Sessions: none (public **and the login portal**) · **Astonish** (brand) · **Super Admin — Tadii** (admin), and the same two for the new console.
- The login portal is walked too, reached by its own **Partner Login** control (its declared address `/login` is private, read from the SEO route owner), so the first screen every brand sees is covered.
- Per screen: the applied appearance (`data-mercenta-theme` + computed `--mr-bg`), uncaught page errors, rendered text
  volume and first heading, horizontal overflow, and whether the screen is an honest placeholder.
- Text contrast uses ONE decoder (`readColor`, exported from `scripts/visual-acceptance.mjs`) that reads every syntax Chromium returns — `rgb()/rgba()`, `oklab()`, `oklch()`, `hsl()`, `hwb()` and `color(srgb …)`. A colour it cannot read is COUNTED and the screen is `WARN`ed — never a silent skip.
- Screenshots are reproducible output and are NOT committed: `test-screenshots/acceptance/<appearance>/<area>__<screen>.png`.

## THE MEASURED RESULT

- **148 screens**, each walked in **both** appearances → **296 captures attempted**, **296 recorded**.
- Verdicts: **PASS 296** · **PLACEHOLDER 0** · **WARN 0** · **FAIL 0**.
- No screen failed: every walked screen rendered real content in both appearances, with no uncaught page error.

<!-- BEGIN GENERATED ACCEPTANCE TABLE -->
| # | Area | Screen | Reached by | brand-dark | brand-light |
|---|------|--------|------------|------------|-------------|
| 1 | public | / | navigated directly, no session | PASS | PASS |
| 2 | public | /how-it-works | navigated directly, no session | PASS | PASS |
| 3 | public | /uk-market-access | navigated directly, no session | PASS | PASS |
| 4 | public | /for-brands | navigated directly, no session | PASS | PASS |
| 5 | public | /faq | navigated directly, no session | PASS | PASS |
| 6 | public | /privacy | navigated directly, no session | PASS | PASS |
| 7 | public | /terms | navigated directly, no session | PASS | PASS |
| 8 | public | /explore-uk-market-fit | navigated directly, no session | PASS | PASS |
| 9 | public | /lift-off | navigated directly, no session | PASS | PASS |
| 10 | public-entry | /login | clicked “Partner Login” on the public homepage, no session | PASS | PASS |
| 11 | admin | Overview | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 12 | admin | Control Centre | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 13 | admin | Work Management | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 14 | admin | Purchase Orders | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 15 | admin | Logistics Hub | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 16 | admin | Returns Tracking | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 17 | admin | Calendar | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 18 | admin | Brand CRM | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 19 | admin | Onboarding | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 20 | admin | Marketing | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 21 | admin | Ad Spend | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 22 | admin | Ads Management | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 23 | admin | Brand Intelligence | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 24 | admin | Global Catalog | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 25 | admin | Fulfillment Track | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 26 | admin | Retail Pipeline | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 27 | admin | Billing | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 28 | admin | Contract Cycle | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 29 | admin | Compliance Approvals | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 30 | admin | Messages | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 31 | admin | Helpdesk | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 32 | admin | Monitoring | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 33 | admin | Super Admin | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 34 | admin | Audit Log | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 35 | admin | Onboarding Tours | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 36 | admin | Integration Settings | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 37 | admin | Founder Investor Centre | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 38 | admin | Partnerships & Fundraising | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 39 | brand | Dashboard | signed in as Astonish, nav item clicked | PASS | PASS |
| 40 | brand | Purchase Orders | signed in as Astonish, nav item clicked | PASS | PASS |
| 41 | brand | Logistics Hub | signed in as Astonish, nav item clicked | PASS | PASS |
| 42 | brand | Returns | signed in as Astonish, nav item clicked | PASS | PASS |
| 43 | brand | Tasks & Deadlines | signed in as Astonish, nav item clicked | PASS | PASS |
| 44 | brand | Calendar | signed in as Astonish, nav item clicked | PASS | PASS |
| 45 | brand | Product Catalog | signed in as Astonish, nav item clicked | PASS | PASS |
| 46 | brand | Inventory | signed in as Astonish, nav item clicked | PASS | PASS |
| 47 | brand | Commercial Readiness | signed in as Astonish, nav item clicked | PASS | PASS |
| 48 | brand | Lift Off | signed in as Astonish, nav item clicked | PASS | PASS |
| 49 | brand | Onboarding & Legal | signed in as Astonish, nav item clicked | PASS | PASS |
| 50 | brand | UK Compliance | signed in as Astonish, nav item clicked | PASS | PASS |
| 51 | brand | Contracts | signed in as Astonish, nav item clicked | PASS | PASS |
| 52 | brand | Analytics | signed in as Astonish, nav item clicked | PASS | PASS |
| 53 | brand | Ads Management | signed in as Astonish, nav item clicked | PASS | PASS |
| 54 | brand | Market Intel | signed in as Astonish, nav item clicked | PASS | PASS |
| 55 | brand | Reports | signed in as Astonish, nav item clicked | PASS | PASS |
| 56 | brand | Documents & Account | signed in as Astonish, nav item clicked | PASS | PASS |
| 57 | brand | Support & Cases | signed in as Astonish, nav item clicked | PASS | PASS |
| 58 | brand | Support & Team | signed in as Astonish, nav item clicked | PASS | PASS |
| 59 | brand | Settings | signed in as Astonish, nav item clicked | PASS | PASS |
| 60 | console-core_admin | Overview | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 61 | console-core_admin | Control Centre | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 62 | console-core_admin | Work Management | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 63 | console-core_admin | Purchase Orders | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 64 | console-core_admin | Logistics Hub | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 65 | console-core_admin | Returns Tracking | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 66 | console-core_admin | Calendar | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 67 | console-core_admin | Brand CRM | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 68 | console-core_admin | Onboarding | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 69 | console-core_admin | Marketing | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 70 | console-core_admin | Ads Manager | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 71 | console-core_admin | Ad Spend | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 72 | console-core_admin | Brand Intelligence | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 73 | console-core_admin | Global Catalog | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 74 | console-core_admin | Fulfillment Track | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 75 | console-core_admin | Retail Pipeline | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 76 | console-core_admin | Billing | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 77 | console-core_admin | Contract Cycle | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 78 | console-core_admin | Compliance Approvals | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 79 | console-core_admin | Messages | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 80 | console-core_admin | Helpdesk | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 81 | console-core_admin | Monitoring | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 82 | console-core_admin | Super Admin | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 83 | console-core_admin | Audit Log | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 84 | console-core_admin | Onboarding Tours | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 85 | console-core_admin | Integration Settings | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 86 | console-core_admin | Founder Investor Centre | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 87 | console-core_admin | Partnerships & Fundraising | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 88 | console-core_brand | Dashboard | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 89 | console-core_brand | Purchase Orders | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 90 | console-core_brand | Logistics Hub | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 91 | console-core_brand | Returns | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 92 | console-core_brand | Tasks & Deadlines | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 93 | console-core_brand | Calendar | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 94 | console-core_brand | Product Catalog | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 95 | console-core_brand | Inventory | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 96 | console-core_brand | Commercial Readiness | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 97 | console-core_brand | Lift Off | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 98 | console-core_brand | Onboarding & Legal | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 99 | console-core_brand | UK Compliance | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 100 | console-core_brand | Contracts | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 101 | console-core_brand | Analytics | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 102 | console-core_brand | Advertising | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 103 | console-core_brand | Market Intel | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 104 | console-core_brand | Reports | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 105 | console-core_brand | Documents & Account | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 106 | console-core_brand | Support & Cases | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 107 | console-core_brand | Support & Team | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 108 | console-core_brand | Settings | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 109 | console-bws | Overview | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 110 | console-bws | Country Discovery | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 111 | console-bws | Brand Discovery | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 112 | console-bws | Brand Intelligence | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 113 | console-bws | UK Distribution Research | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 114 | console-bws | UK Channel Research | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 115 | console-bws | Pitch Targets | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 116 | console-bws | Opportunity Assessment | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 117 | console-bws | Acquisition Pipeline | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 118 | console-bws | Brand Portfolio | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 119 | console-bws | Product Catalogue | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 120 | console-bws | Brand Onboarding | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 121 | console-bws | Partner Portal | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 122 | console-bws | Compliance & Regulatory | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 123 | console-bws | Import & Excise | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 124 | console-bws | Wholesale Distribution | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 125 | console-bws | Inventory & Fulfilment | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 126 | console-bws | Campaign Studio | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 127 | console-bws | Brand Growth | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 128 | console-bws | Financials | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 129 | console-bws | Reports & Analytics | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 130 | console-bws | Admin & Settings | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 131 | console-talent_commerce | Dashboard | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 132 | console-talent_commerce | Rights Holders | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 133 | console-talent_commerce | Brands & Products | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 134 | console-talent_commerce | UK Opportunities | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 135 | console-talent_commerce | Brand Acquisition | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 136 | console-talent_commerce | Campaigns | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 137 | console-talent_commerce | Brand Store Studio | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 138 | console-talent_commerce | Product Concepts | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 139 | console-talent_commerce | Product Development | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 140 | console-talent_commerce | Collections | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 141 | console-talent_commerce | Creative Assets | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 142 | console-talent_commerce | Approvals | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 143 | console-talent_commerce | Purchase Orders | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 144 | console-talent_commerce | Orders & Fulfilment | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 145 | console-talent_commerce | Inventory | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 146 | console-talent_commerce | Royalties | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 147 | console-talent_commerce | Financial Reports | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 148 | console-talent_commerce | Settings | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
<!-- END GENERATED ACCEPTANCE TABLE -->

## WHAT THE PASS FOUND

_Written by hand after looking at the captures. The table above proves each screen rendered; only a
person can say what it looks like._

**§BATCH 4b (2026-11-28) — THE THREE DEFECTS THIS SECTION RECORDED AS "NOT FIXED" ARE FIXED, AND THE
PASS IS NOW CLEAN.** This pass is **296/296 captures — PASS 296 · PLACEHOLDER 0 · WARN 0 · FAIL 0**. The
previous pass was PASS 293 · WARN 3, and the three warnings were exactly the ones the §BATCH 4 entry below
diagnosed. All three were fixed at source in §BATCH 4b (the registry row is
`design-batch4b-homepage-fixed-dark-contrast`; the full record is in `PROJECT_STATUS.md` and
`STATUS_CHECK.md`):

| Was | Now | Why it was wrong |
|---|---|---|
| “Growth”, the flow diagram's final step — **1:1** in both appearances | PASS | the element authored **two** backgrounds (`bg-paper` *and* `bg-ink`); `cn()` joins rather than merges, so `bg-paper` won under `text-paper` |
| the photo badges and the “Origin” bar — **1.41:1** / **1.31:1** in the light appearance | PASS | `bg-ink/80` was re-pointed at the appearance-reactive `--mr-surface` by the **generated** alpha-shim layer, so in the light appearance a black scrim became a white wash |
| brand **Support & Team** — message meta text **1.17:1** | PASS | `text-muted` (#A5A5A5) sat on the **orange** accent fill (#FF6A00); the fill now chooses its own tokens (`--mr-on-accent`) |

**Two further defects were found while proving the middle one, and fixed with it.** The shim generator
**refused to run at all** (19 unresolved colour keys), so the committed stylesheet had not been its own
output since the `paper`/`signal` utilities arrived; and because Tailwind v4 **drops** the alpha modifier for
a `var()`-based colour, that stale file had left **six** alpha utilities rendering **fully opaque**. Those six
tints are shimmed again.

**THE REST OF THIS SECTION IS THE §BATCH 4 PASS, KEPT AS ITS OWN RECORD.** It describes the pass that
produced the *previous* table, and it is accurate about what that pass found — including the sentence “None
of these is fixed in this increment”, which was true then and is not true now. **The state of the three
defects is the table immediately above, not that sentence.**

**§BATCH 4b, SECOND HALF — THE OWNER'S COLOUR DECISION, AND A SEVENTH DEFECT THIS PASS COULD NOT SEE.**
The owner decided (2026-11-28): keep the orange PATCHES exactly as they are, add a darker orange for orange
WRITING on white. Implemented as `text-accent-700` (`--mr-accent-700` = `BRAND_PALETTE.orangeDeep` #B34700 —
already declared): **2.87:1 → 5.50:1**, with the fill still `#FF6A00` (asserted). Measuring it exposed a
seventh defect **and a blind spot in this instrument**: an eyebrow on a light section was still flagged
`dark`, so its label rendered `text-paper/50` (white at 50%) on `#FFFFFF` — **1:1, invisible** — while its
index kept the 2.87:1 orange. **The walk had never measured it, because the loop skipped any element with
element children: mixed-content text — a text node beside element children — was never measured at all.**
That loop now measures an element's OWN direct text nodes (`ownTextOf`), so a leaf is still covered exactly
as before and mixed content is covered for the first time. **With the blind spot open, this pass reports the
homepage as WARN (2 runs below 1.6:1); with it closed and the defect fixed, 296/296 clean.**

**§BATCH 4 (2026-11-28) — THE INSTRUMENT NOW SEES EVERY COLOUR, AND WHAT IT FOUND.**


*This section is written by hand and preserved across re-runs (the runner keeps everything below the
`## WHAT THE PASS FOUND` heading).*

Three fixes were made to the measuring tool itself, all in `scripts/visual-acceptance.mjs`:

1. **The colour decoder reads every syntax the browser returns.** It used to read only `rgb()`/`rgba()`,
   so it was BLIND to three syntaxes a probe of the running product actually returns for this palette:
   `oklab(0 0 0 / 0.5)` (every Tailwind v4 `/opacity` utility — `text-ink/50`, `text-paper/55`),
   `oklch(…)` (`--color-live`, `--color-tracker-*`) and `color(srgb …)` (`bg-ink/80`). Every colour it
   could not read was **silently skipped**, so text painted with one was never measured at all. The
   decoder (`readColor`, one definition, exported) now reads rgb/rgba · hsl · hwb · oklab · oklch ·
   `color(srgb …)` · hex, and **REPORTS** a syntax it cannot read instead of dropping it.
2. **A colour it cannot read is counted, not ignored.** `unreadableForeground` / `unreadableBackground`
   are recorded per screen, and a screen with an unreadable colour is `WARN`ed — never claimed clean.
   (In this run: **0** unreadable colours across all 296 captures — the decoder reads everything the
   product actually uses.)
3. **The login portal is walked.** `/login` is read from `PRIVATE_ROUTE_PREFIXES` (`publicRoutes.ts`,
   the owner that already declares it) and reached by the product's own **Partner Login** control, so
   the first screen every brand sees is no longer the one screen outside the pass. The pass now covers
   **148 of 148** screens (was 147 of 148).

**THE HOMEPAGE'S TWO RECORDED COLOUR DEFECTS NOW HAVE A MEASURED CAUSE — and the new coverage found
THREE MORE of the same kind in the light appearance.** None of these is fixed in this increment (the
recorded plan fixes the homepage colours as its own step, and part of it is a colour decision); they are
recorded here with the numbers and the cause.

| Appearance | Run | Measured | Cause |
|---|---|---|---|
| brand-dark | “Growth” | **1:1** — `#FFFFFF` on `#FFFFFF` | the card carries **both** `bg-paper` and `bg-ink` (`cn()` joins, it does not merge), and `bg-paper` wins by stylesheet order — a white card under `text-paper` |
| brand-dark | “Range · Pricing” | **1:1** — white **at 55%** over `#FFFFFF` | same card; `text-paper/55` |
| brand-light | “Growth”, “Range · Pricing” | **1:1** | same card |
| brand-light | “Received · checked”, “Located · counted”, “Picked · to channel” | **1.41:1** — white **at 70%** over `#CCCCCC` | the tracker's stage badges: `text-paper/70` over a `bg-ink/80` scrim, which in the light appearance resolves to **white at 80%** over the dark tracker |
| brand-light | “Origin” | **1.31:1** — white **at 55%** over `#CCCCCC` | the same scrim treatment |

The three light-appearance runs are a defect this instrument could not see before this increment: they
are painted with `oklab()` / `color(srgb …)` values, which the old decoder skipped. **They are the same
class of fault as the two already recorded** — a fixed-dark element whose ink follows the appearance.
The dark appearance is unaffected (2 runs, both on the “Growth” card).

**WHAT THIS INSTRUMENT STILL DOES NOT SEE — stated, not implied.** It renders at 1440×900 in headless
Chromium only: it is not a phone-width pass, it does not measure motion, and it cannot judge whether a
screen *looks good*. The contrast floor it applies is **1.6:1** — “can a person see this at all” — not
WCAG AA, so the seven `text-signal` labels at **2.87:1** recorded in `PROJECT_STATUS.md` are below AA but
above this floor and are therefore **not** counted here.


1. **THE ADS MANAGEMENT HEADER WAS WHITE-ON-LIGHT — the tab strip and the wordmark were invisible in the
   light appearance.** The screen's header used `bg-ink/90`, and this project's shim layer rewrites that
   class onto the *theme* surface (`src/theme-alpha-shims.css`), which is light in the light appearance —
   while every text colour on that screen comes from the fixed Lovable palette (`text-paper` = #FFFFFF).
   Fixed: the header is the same opaque `bg-ink` as the screen's own root, so the fixed-dark design stays
   readable in both appearances (`src/components/ads/AdsManagement.tsx`).

2. **`--mr-text-soft` WAS DECLARED WHITE IN THE LIGHT THEME — white text on a white page.** Section
   headings on the legal pages (*Privacy*, *Terms*) and on the marketing pages use `text-soft`, so those
   headings rendered as **blank gaps**: the Privacy Policy showed its bullet lists with no headings above
   them. The dark theme declares soft as WHITE (its strongest text); the light block now mirrors it with
   BLACK (`src/config/themes.ts`).

3. **THE CONSOLE'S STATUS VALUES WERE INVISIBLE — the Partnerships screen's "YES" answers measured 1.23:1
   against their own card.** The tone tables used `text-emerald-700` / `text-amber-700` / `text-red-700` /
   `text-sky-700` / `text-amber-800`. Those families are remapped by `tailwind.config.js` to the *brand*
   state tokens — and `--mr-state-success` is **#E8E8E8 in the dark appearance**, i.e. near-white text on
   the console's fixed light canvas. Fixed: the console's own AA-safe state colours (`text-state-success`
   #15803D · `text-state-warning` #B45309 · `text-state-danger` #B91C1C · `text-state-info` #1D4ED8), which
   `ConsolePrimitives.tsx` had already adopted in Wave 3 — `ConsolePanels.tsx` and
   `AdminControlCentreView.tsx` had been missed.

4. **TWO MORE REMAPPED PALETTE FAMILIES WERE STILL IN THE CONSOLE** — `text-indigo-900` on the brand
   logistics screen (which resolved to `--mr-state-info`, a mid-grey, 2.4:1 on the console canvas) and
   `bg-orange-50` on the onboarding selection cards. Both repointed onto declared console classes; the
   accent tint was given its **own token holding the exact value it already rendered**
   (`.bg-accent-tint`), so the selection looks identical.

**WHAT LOOKS RIGHT AND SHOULD NOT BE "FIXED".**

- **The public pages keep a dark hero band in BOTH appearances** (the homepage, `DesignE`). That is the
  approved market-entry design, not a broken theme: the page fill, the nav bar, the cookie notice and every
  control around it do follow the appearance, and the contrast measurement confirms the hero's own text is
  readable on its own dark band.
- **The new console renders its own fixed light palette in both appearances** (measured: `brand-dark` and
  `brand-light` captures are visually the same). This is the console's declared design in
  `src/next/next.css` (`#FAFAFA` canvas, `#FFFFFF` cards) — the appearance switch has no effect there. It is
  **recorded, not changed**: making the console theme-aware is a design decision for the owner, not a
  defect fix.
- **"Open new console" floats on every screen, including the public homepage.** It is the documented,
  temporary switch to the new console (`src/App.tsx`), removed when that console becomes the default.
- **Placeholder screens are honest.** All 44 console destinations that are not built say *"is not available
  yet"* rather than showing invented data — they are recorded as `PLACEHOLDER`, not as passes or failures.
- **No screen raised an uncaught page error and no screen logged a console error** in any of the 294
  captures.

**WHAT THIS PASS DOES NOT PROVE.** It renders at 1440×900 in headless Chromium only — it is not a
phone-width pass, it does not measure motion, and it cannot judge whether a screen *looks good*, only
whether it rendered, whether its text is legible against its own surface, and whether it is reachable. The
contrast floor it applies (1.6:1) is deliberately lower than WCAG AA: it is a "can a person see this at
all" gate, not a typography audit.
