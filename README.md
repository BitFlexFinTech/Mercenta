# Mercenta

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-uum48upz)

Mercenta is the **proxy / distribution and operational layer between brands and
the retail-channel (Amazon Vendor Central) relationship**. Mercenta operates the
Vendor Central account; brands work through Mercenta.

## Canonical documentation — read in this order

| Document | What it is |
|---|---|
| **`docs/MERCENTA_BUSINESS_MODEL.md`** | **CANONICAL** business model. If anything else contradicts it, this wins. |
| `MERCENTA_ARCHITECTURE.md` | How the platform is built (shells, domain, seams). |
| `docs/INTEGRATIONS.md` | Provider registry, adapter seams, live-activation requirements. |
| `PRODUCTION_READINESS.md` | Every active mock/placeholder and the credential that replaces it. |
| `GO_LIVE.md` | Ordered go-live playbook for the production domain. |
| `PROJECT_STATUS.md` | What is actually built, verified, and next. |
| `HANDOFF.md` | Session-to-session handoff state. |
| `docs/DESIGN_SYSTEM.md` | UI primitives, tokens and presentation rules. |

## Validation gates (run before claiming anything is done)

```bash
npx tsc --noEmit -p tsconfig.app.json   # types
npm run lint                            # eslint (src + e2e)
npm run build                           # production build
npm run validate:wording                # outward-facing wording gate
node scripts/integrity-audit.mjs        # structural integrity audit
node scripts/validate-canonical-model.mjs        # canonical business rules
node scripts/validate-commercial-models.mjs      # §3/§5/§9/§25 the two commercial models + VAT
node scripts/validate-db-hardening.mjs           # §23 database-boundary invariants
node scripts/validate-edge-functions.mjs         # §22 deploy-time Edge Functions
node scripts/validate-document-verification.mjs  # §M2 compliance document verification
node scripts/validate-financial-reconciliation.mjs # §M6 money flow + payout gates
node scripts/validate-payouts.mjs                # §7 payout gates + §6 rails
node scripts/validate-mock-providers.mjs         # §13 DHL + Palletline simulation
node scripts/validate-investor-demo.mjs          # deterministic zero-network lifecycle (25 stages)
# --- M12 (commercial relationship, strategy, estimator, founder centre) ---
node scripts/validate-commercial-model-selection.mjs # §5/§19 brand-level commercial relationship (fail-closed)
node scripts/validate-intelligence-strategy.mjs      # §12–§16 acquisition strategy, source markets, trade programmes
node scripts/validate-sales-estimator.mjs            # §15/§16 estimator + New Product Launch Programme modelling
node scripts/validate-founder-centre.mjs             # §21 investor centre + partnerships/fundraising centre
node scripts/validate-google-integration.mjs         # §21 M13 P8 Google mock/real seam + workspace setup wizard
node scripts/validate-company-control-centre.mjs     # §22–§25 M13 P9 company/government compliance centre
node scripts/validate-operating-costs.mjs            # §27 M13 P10 cost model + runtime model policy + AI ceilings
node scripts/validate-command-centre.mjs             # §32/§34 M13 P11 command centre derivation + tab routing
node scripts/validate-typography-scale.mjs      # canonical operational type scale + the 11px floor (Wave 3)
node scripts/validate-founder-operating-system.mjs # founder OS: automation registry, control centre, bounded AI
node scripts/validate-kb-sufficiency.mjs        # helpdesk KB sufficiency gate
node scripts/validate-provider-mode-safety.mjs  # UNKNOWN is NEVER simulation (fail-closed provider modes)
node scripts/validate-routing-gateways.mjs      # Phase 2 routing gateways over the canonical records
node scripts/validate-uk-market-fit.mjs         # Explore UK Market Fit / pre-audit engine (Phase 1)
node scripts/validate-seo-foundation.mjs         # public route SSOT + fail-closed noindex + robots/sitemap pin
node scripts/validate-bounded-ai.mjs             # bounded intelligent-decision seam (free-only, single egress, no AI in forbidden domains)
node scripts/rls-audit.mjs              # §39 static RLS audit (every schema table)
node scripts/validate-rls-hardening.mjs # §39 audit_log + applications RLS hardening pin
npx playwright test                     # full E2E suite
```

Every gate above is also reachable as an `npm run validate:*` alias
(`npm run validate:seo`, `validate:bounded-ai`, `validate:typography`,
`validate:uk-market-fit`, `validate:founder-os`, `validate:kb-sufficiency`,
`validate:provider-safety`, `validate:routing`, `validate:commercial-readiness`,
`validate:brain`, `validate:logistics-map`, `validate:product-routes`,
`validate:workspace-shell`, `validate:canonical-propagation`).

## Repository invariants — read before committing

- **`git status --porcelain` MUST be empty** at every checkpoint, delivery and
  handoff (`.clinerules/operating-model.md` §6). A dirty tree is permitted only
  while work is actively in progress inside a session. Inherited dirtiness is
  RECONCILED — required work committed, obsolete material removed — never carried
  forward and never left "for later".
- **Generated artefacts are never tracked** and are never included in the review
  ZIP: `test-screenshots/`, `forensic-captures/`, `playwright-report/`,
  `test-results/`, `e2e-report/`, `Review Zip/*.zip` (see `.gitignore`).
- **Personal/compliance documents stay untracked**: `Company Documents/`,
  `Partnerships/`, `Admin Accounts/`, `Random/`. Never read, print or bundle a
  secret; `.env*` is never read and never inside the review ZIP.
- Business invariants: `.clinerules/mercenta-business-model.md`. Operating model:
  `.clinerules/operating-model.md`. Project-state sources:
  `.clinerules/project-state-contract.md`.

## The two commercial models (§3)

Mercenta supports exactly two commercial relationships with a brand, chosen at
onboarding: **Model A (commission/agent-style)** and **Model B (buy/resell/
distribution)**. The canonical definitions live in `src/config/commercialModel.ts`
and the arithmetic in `src/lib/finance/commercialModel.ts` — with the worked
investor-demo figures (£10,000 @ 20% ⇒ £2,000/£8,000; £10,000 − £7,500 ⇒ £2,500
gross spread) pinned by `validate-commercial-models.mjs`.

The commercial relationship is **internal** to Mercenta and the brand. It is
**separate from** the retail-channel compliance documentation a product needs,
and changing the model can never change or bypass those requirements.

## Payout rails (§6)

**Payoneer is the default payout rail; Wise is the secondary rail**
(`src/config/payouts.ts` — Founder decision T-1). Xero is the accounting/reconciliation layer, not the
bank; Stripe bills the flat monthly subscription only and is refused as a payout
rail. No payout leaves Mercenta without explicit human approval (§7).

Deployment is **only** `scripts/deploy-demo.sh` (demo.mercenta.co.uk), and only
when explicitly authorised. See `GO_LIVE.md`.

