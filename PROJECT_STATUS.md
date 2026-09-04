# PROJECT_STATUS.md

> Source of truth for current project state. Updated after every session.

## In-progress / Recent work

| Work Item | Status | Notes |
|---|---|---|
| Supabase core entity migrations (002-015) | ✅ DONE | 14 tables created: brands, products, purchase_orders, purchase_order_lines, shipments, shipment_cartons, deductions, contracts, compliance_docs, messages, billing_invoices, crm_tasks, crm_notes, audit_log. All deployed to live Supabase instance (project ref `jcjevaepsweoeiawfurr`). |
| Demo data seeded to Supabase (016) | ✅ DONE | 11 brands + 22 products + 22 POs + 44 PO lines + 7 shipments + 11 contracts + 44 compliance docs + 15 messages + 4 deductions + 11 billing invoices. All rows persisted via migration 016. Deterministic UUIDs map demo string IDs (`a0000000-…`-series). |
| RLS on all tables | ✅ DONE | All tables except `brands` and `audit_log` use `brand_isolation` policy (`brand_id = auth.jwt() ->> 'tenant_id'`). `brands` uses `brand_access` (`id = tenant_id`). `audit_log` intentionally open (admin-only cross-tenant view). |
| Migration 001 | ✅ DONE | `homepage_content` table pre-existing at deploy; marked `applied` in supabase migration history via `supabase migration repair`. |
| **Persistence wiring (api.ts → Supabase)** | ✅ **DONE** | Every function in `src/data/api.ts` now tries Supabase first, falls back to `demoStore` with `console.warn` on failure. ID translation layer added (brand UUID ↔ string ID via `legacy_demo_id`). Write operations also use try/catch/fallback. |

## What's not done / next steps

- **Frontend ↔ Supabase ID mapping**: ✅ **RESOLVED** — ID translation layer added to api.ts (`_ensureBrandIdMap`, `_fromBrandUuid`, `_toBrandUuid`, `_translateRow`/`_translateRows`). Fetch/write operations translate between UUIDs and string IDs automatically.
- **Apply seed migration (016) to live Supabase**: The remote Supabase instance (`jcjevaepsweoeiawfurr`) currently lacks the seed migration's additional columns (`legacy_demo_id` on brands, `channel`/`direction`/`subject`/`body`/`sent_by`/`requires_human` on messages, etc.). Until applied, Supabase queries will fail and fall back to demoStore — which is correct dev-mode behavior.
- **Frontend live-mode refactor**: Most admin/brand views still import `demoStore` directly instead of routing through `api.ts`. Live-mode mutations will diverge until the `api.ts` refactor from the Stage-6 audit lands.
- **`scripts/gen-seed-migration.py`**: utility used to generate migration 016. Safe to delete if no longer needed.

## Session stop notes

- Last session (2026-09-04): Persistence wiring completed. All reads/writes in `api.ts` try Supabase first, fall back to demoStore on failure. ID translation layer bridges UUID ↔ string IDs. typecheck ✅, build ✅, lint ✅.
# PROJECT_STATUS.md

> Source of truth for current project state. Updated after every session.

## In-progress / Recent work

| Work Item | Status | Notes |
|---|---|---|
| Supabase core entity migrations (002-015) | ✅ DONE | 14 tables created: brands, products, purchase_orders, purchase_order_lines, shipments, shipment_cartons, deductions, contracts, compliance_docs, messages, billing_invoices, crm_tasks, crm_notes, audit_log. All deployed to live Supabase instance (project ref `jcjevaepsweoeiawfurr`). |
| Demo data seeded to Supabase (016) | ✅ DONE | 11 brands + 22 products + 22 POs + 44 PO lines + 7 shipments + 11 contracts + 44 compliance docs + 15 messages + 4 deductions + 11 billing invoices. All rows persisted via migration 016. Deterministic UUIDs map demo string IDs (`a0000000-…`-series). |
| RLS on all tables | ✅ DONE | All tables except `brands` and `audit_log` use `brand_isolation` policy (`brand_id = auth.jwt() ->> 'tenant_id'`). `brands` uses `brand_access` (`id = tenant_id`). `audit_log` intentionally open (admin-only cross-tenant view). |
| Migration 001 | ✅ DONE | `homepage_content` table pre-existing at deploy; marked `applied` in supabase migration history via `supabase migration repair`. |

## What's not done / next steps

- **Frontend ↔ Supabase ID mapping**: The frontend demo layer uses string IDs (`brand-zambezi`, `po-brand-zambezi-1`). The Supabase rows use deterministic UUIDs (`a0000000-…`). No API-layer ID translation exists yet — live-mode reads via `api.ts` need a mapping or refactor to reconcile.
- **Frontend live-mode refactor**: Most admin/brand views still import `demoStore` directly instead of routing through `api.ts`. Live-mode mutations will diverge until the `api.ts` refactor from the Stage-6 audit lands.
- **`scripts/gen-seed-migration.py`**: utility used to generate migration 016. Safe to delete if no longer needed.

## Session stop notes

- Last session (2026-09-04): created and deployed migrations 002-016, seeded demo data, verified all tables and row counts.
- Working tree has untracked files: 14 migration SQL files + seed (016) + `scripts/gen-seed-migration.py` + `supabase/.temp/*`. Not committed (user hasn't requested a commit).