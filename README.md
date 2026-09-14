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
node scripts/validate-document-verification.mjs  # §M2 compliance document verification
node scripts/validate-financial-reconciliation.mjs # §M6 money flow + payout gates
node scripts/validate-investor-demo.mjs          # deterministic zero-network lifecycle
npx playwright test                     # full E2E suite
```

Deployment is **only** `scripts/deploy-demo.sh` (demo.mercenta.co.uk), and only
when explicitly authorised. See `GO_LIVE.md`.

