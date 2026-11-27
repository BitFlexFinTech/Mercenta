# §BATCH 8 — THE FULL VISUAL ACCEPTANCE PASS (2026-11-27)

> **THIS IS A GENERATED RECORD, AND IT IS PINNED.** The table below is written by
> `node scripts/visual-acceptance.mjs`, which walks every screen the product declares in BOTH
> appearances in a real Chromium browser. `scripts/validate-visual-acceptance.mjs` re-derives the
> same inventory from the same declarations and FAILS if this record stops covering a screen — so
> it cannot go stale, and it cannot quietly claim a screen it never walked. Only the
> `WHAT THE PASS FOUND` section below is written by hand.
>
> **THE TITLE DATE IS THE DATE OF THE PASS THAT PRODUCED THIS TABLE, NOT A HISTORICAL LABEL**
> (regenerated 2026-11-27 after the console port changed 44 console screens from placeholders to
> real screens). The FILE NAME keeps its original `2026-11-25` because the path is pinned by
> `scripts/validate-visual-acceptance.mjs`; the content is always the LATEST pass, never an
> archive — so no reader has to infer a date from the file name.

## HOW THE PASS WAS RUN

- Inventory discovered from: `src/components/layout/AdminShell.tsx` · `src/components/layout/BrandShell.tsx` · `src/next/navConfig.ts` · `src/lib/seo/publicRoutes.ts`
- Appearances: **brand-dark** (`#000000` page fill) and **brand-light** (`#FFFFFF` page fill) — the two the app allows.
- Browser: headless Chromium at 1440×900, `prefers-reduced-motion: reduce`, so a capture cannot depend on smooth scrolling.
- Sessions: none (public) · **Astonish** (brand) · **Super Admin — Tadii** (admin), and the same two for the new console.
- Per screen: the applied appearance (`data-mercenta-theme` + computed `--mr-bg`), uncaught page errors, rendered text
  volume and first heading, horizontal overflow, and whether the screen is an honest placeholder.
- Screenshots are reproducible output and are NOT committed: `test-screenshots/acceptance/<appearance>/<area>__<screen>.png`.

## THE MEASURED RESULT

- **147 screens**, each walked in **both** appearances → **294 captures attempted**, **294 recorded**.
- Verdicts: **PASS 291** · **PLACEHOLDER 0** · **WARN 3** · **FAIL 0**.
- No screen failed: every walked screen rendered real content in both appearances, with no uncaught page error.

<!-- BEGIN GENERATED ACCEPTANCE TABLE -->
| # | Area | Screen | Reached by | brand-dark | brand-light |
|---|------|--------|------------|------------|-------------|
| 1 | public | / | navigated directly, no session | WARN | WARN |
| 2 | public | /how-it-works | navigated directly, no session | PASS | PASS |
| 3 | public | /uk-market-access | navigated directly, no session | PASS | PASS |
| 4 | public | /for-brands | navigated directly, no session | PASS | PASS |
| 5 | public | /faq | navigated directly, no session | PASS | PASS |
| 6 | public | /privacy | navigated directly, no session | PASS | PASS |
| 7 | public | /terms | navigated directly, no session | PASS | PASS |
| 8 | public | /explore-uk-market-fit | navigated directly, no session | PASS | PASS |
| 9 | public | /lift-off | navigated directly, no session | PASS | PASS |
| 10 | admin | Overview | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 11 | admin | Control Centre | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 12 | admin | Work Management | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 13 | admin | Purchase Orders | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 14 | admin | Logistics Hub | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 15 | admin | Returns Tracking | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 16 | admin | Calendar | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 17 | admin | Brand CRM | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 18 | admin | Onboarding | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 19 | admin | Marketing | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 20 | admin | Ad Spend | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 21 | admin | Ads Management | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 22 | admin | Brand Intelligence | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 23 | admin | Global Catalog | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 24 | admin | Fulfillment Track | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 25 | admin | Retail Pipeline | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 26 | admin | Billing | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 27 | admin | Contract Cycle | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 28 | admin | Compliance Approvals | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 29 | admin | Messages | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 30 | admin | Helpdesk | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 31 | admin | Monitoring | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 32 | admin | Super Admin | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 33 | admin | Audit Log | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 34 | admin | Onboarding Tours | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 35 | admin | Integration Settings | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 36 | admin | Founder Investor Centre | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 37 | admin | Partnerships & Fundraising | signed in as Super Admin — Tadii, nav item clicked | PASS | PASS |
| 38 | brand | Dashboard | signed in as Astonish, nav item clicked | PASS | PASS |
| 39 | brand | Purchase Orders | signed in as Astonish, nav item clicked | PASS | PASS |
| 40 | brand | Logistics Hub | signed in as Astonish, nav item clicked | PASS | PASS |
| 41 | brand | Returns | signed in as Astonish, nav item clicked | PASS | PASS |
| 42 | brand | Tasks & Deadlines | signed in as Astonish, nav item clicked | PASS | PASS |
| 43 | brand | Calendar | signed in as Astonish, nav item clicked | PASS | PASS |
| 44 | brand | Product Catalog | signed in as Astonish, nav item clicked | PASS | PASS |
| 45 | brand | Inventory | signed in as Astonish, nav item clicked | PASS | PASS |
| 46 | brand | Commercial Readiness | signed in as Astonish, nav item clicked | PASS | PASS |
| 47 | brand | Lift Off | signed in as Astonish, nav item clicked | PASS | PASS |
| 48 | brand | Onboarding & Legal | signed in as Astonish, nav item clicked | PASS | PASS |
| 49 | brand | UK Compliance | signed in as Astonish, nav item clicked | PASS | PASS |
| 50 | brand | Contracts | signed in as Astonish, nav item clicked | PASS | PASS |
| 51 | brand | Analytics | signed in as Astonish, nav item clicked | PASS | PASS |
| 52 | brand | Ads Management | signed in as Astonish, nav item clicked | PASS | PASS |
| 53 | brand | Market Intel | signed in as Astonish, nav item clicked | PASS | PASS |
| 54 | brand | Reports | signed in as Astonish, nav item clicked | PASS | PASS |
| 55 | brand | Documents & Account | signed in as Astonish, nav item clicked | PASS | PASS |
| 56 | brand | Support & Cases | signed in as Astonish, nav item clicked | PASS | PASS |
| 57 | brand | Support & Team | signed in as Astonish, nav item clicked | WARN | PASS |
| 58 | brand | Settings | signed in as Astonish, nav item clicked | PASS | PASS |
| 59 | console-core_admin | Overview | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 60 | console-core_admin | Control Centre | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 61 | console-core_admin | Work Management | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 62 | console-core_admin | Purchase Orders | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 63 | console-core_admin | Logistics Hub | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 64 | console-core_admin | Returns Tracking | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 65 | console-core_admin | Calendar | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 66 | console-core_admin | Brand CRM | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 67 | console-core_admin | Onboarding | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 68 | console-core_admin | Marketing | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 69 | console-core_admin | Ads Manager | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 70 | console-core_admin | Ad Spend | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 71 | console-core_admin | Brand Intelligence | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 72 | console-core_admin | Global Catalog | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 73 | console-core_admin | Fulfillment Track | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 74 | console-core_admin | Retail Pipeline | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 75 | console-core_admin | Billing | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 76 | console-core_admin | Contract Cycle | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 77 | console-core_admin | Compliance Approvals | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 78 | console-core_admin | Messages | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 79 | console-core_admin | Helpdesk | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 80 | console-core_admin | Monitoring | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 81 | console-core_admin | Super Admin | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 82 | console-core_admin | Audit Log | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 83 | console-core_admin | Onboarding Tours | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 84 | console-core_admin | Integration Settings | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 85 | console-core_admin | Founder Investor Centre | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 86 | console-core_admin | Partnerships & Fundraising | new console (?console=next), surface "Operations Console", nav item clicked | PASS | PASS |
| 87 | console-core_brand | Dashboard | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 88 | console-core_brand | Purchase Orders | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 89 | console-core_brand | Logistics Hub | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 90 | console-core_brand | Returns | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 91 | console-core_brand | Tasks & Deadlines | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 92 | console-core_brand | Calendar | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 93 | console-core_brand | Product Catalog | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 94 | console-core_brand | Inventory | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 95 | console-core_brand | Commercial Readiness | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 96 | console-core_brand | Lift Off | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 97 | console-core_brand | Onboarding & Legal | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 98 | console-core_brand | UK Compliance | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 99 | console-core_brand | Contracts | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 100 | console-core_brand | Analytics | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 101 | console-core_brand | Advertising | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 102 | console-core_brand | Market Intel | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 103 | console-core_brand | Reports | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 104 | console-core_brand | Documents & Account | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 105 | console-core_brand | Support & Cases | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 106 | console-core_brand | Support & Team | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 107 | console-core_brand | Settings | new console (?console=next), surface "Partner Portal", nav item clicked | PASS | PASS |
| 108 | console-bws | Overview | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 109 | console-bws | Country Discovery | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 110 | console-bws | Brand Discovery | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 111 | console-bws | Brand Intelligence | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 112 | console-bws | UK Distribution Research | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 113 | console-bws | UK Channel Research | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 114 | console-bws | Pitch Targets | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 115 | console-bws | Opportunity Assessment | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 116 | console-bws | Acquisition Pipeline | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 117 | console-bws | Brand Portfolio | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 118 | console-bws | Product Catalogue | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 119 | console-bws | Brand Onboarding | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 120 | console-bws | Partner Portal | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 121 | console-bws | Compliance & Regulatory | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 122 | console-bws | Import & Excise | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 123 | console-bws | Wholesale Distribution | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 124 | console-bws | Inventory & Fulfilment | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 125 | console-bws | Campaign Studio | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 126 | console-bws | Brand Growth | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 127 | console-bws | Financials | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 128 | console-bws | Reports & Analytics | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 129 | console-bws | Admin & Settings | new console (?console=next), surface "BWS Workspace", nav item clicked | PASS | PASS |
| 130 | console-talent_commerce | Dashboard | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 131 | console-talent_commerce | Rights Holders | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 132 | console-talent_commerce | Brands & Products | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 133 | console-talent_commerce | UK Opportunities | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 134 | console-talent_commerce | Brand Acquisition | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 135 | console-talent_commerce | Campaigns | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 136 | console-talent_commerce | Brand Store Studio | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 137 | console-talent_commerce | Product Concepts | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 138 | console-talent_commerce | Product Development | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 139 | console-talent_commerce | Collections | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 140 | console-talent_commerce | Creative Assets | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 141 | console-talent_commerce | Approvals | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 142 | console-talent_commerce | Purchase Orders | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 143 | console-talent_commerce | Orders & Fulfilment | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 144 | console-talent_commerce | Inventory | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 145 | console-talent_commerce | Royalties | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 146 | console-talent_commerce | Financial Reports | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
| 147 | console-talent_commerce | Settings | new console (?console=next), surface "Talent Commerce", nav item clicked | PASS | PASS |
<!-- END GENERATED ACCEPTANCE TABLE -->

## WHAT THE PASS FOUND

_Written by hand after looking at the captures. The table above proves each screen rendered; only a
person can say what it looks like._

**FOUR REAL DEFECTS WERE FOUND AND FIXED AT SOURCE. Every one of them passed typecheck, the build and
every validator that existed before this pass, because none of those can see a colour.**

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
