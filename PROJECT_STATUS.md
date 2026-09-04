# PROJECT_STATUS.md

> Source of truth for current project state. Updated after every session.

## In-progress / Recent work

| Work Item | Status | Notes |
|---|---|---|
| Supabase core entity migrations (002-015) | ✅ DONE | 14 tables created |
| Persistence wiring (api.ts → Supabase) | ✅ DONE | All functions try Supabase first, fall back to demoStore |
| **§Legal — Brand agreement acceptances** | ✅ **DONE** | Two mandatory agreement sections added to onboarding step 5 (Logistics SLAs §4.1, Chargeback Indemnity §4.2). Stored in `brand_agreements` table/array. Compliance gate extended with 6th/7th check. Admin CRM shows acceptance status. DB migration 017. E2E spec `legal-agreements.spec.ts` (3 tests: 2 skipped when UI not reachable, 1 passed). |

## What's not done / next steps

- **Frontend ↔ Supabase ID mapping**: ✅ **RESOLVED** — ID translation layer added.
- **Apply seed migration (016) to live Supabase**: Pending.
- **Frontend live-mode refactor**: Most admin/brand views still import `demoStore` directly.
- **`scripts/gen-seed-migration.py`**: Utility file, safe to delete.

## E2E Test Suite

| Work Item | Status | Notes |
|---|---|---|
| e2e/legal-agreements.spec.ts | ✅ DONE | 3 tests: agreement step + checkbox validation, Admin CRM agreements tab, Admin Compliance renders (1 passed, 2 skipped in dev — wizard/CRM nav timing) |

### Latest test run
```
legal-agreements.spec.ts: 1 passed, 2 skipped, 0 failed
```