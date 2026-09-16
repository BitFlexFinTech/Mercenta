# MERCENTA FUNCTIONAL RISK MAP

> Phase 1 output. Every area classified SAFE / MODERATE / HIGH / CRITICAL based
> on repository + visual audit evidence. This is a risk map, not a fix list —
> do not silently change business rules while redesigning.

## CRITICAL (must not break; guardrail rules apply)

| Area | Evidence | Why critical |
|---|---|---|
| PO workflow rules | `PurchaseOrderStatus`, `LineAckStatus`, 24h ack deadline, `PO_REJECTION_CODES`, freight windows in `types.ts` | Non-negotiable business sequence (spec §13) |
| RBAC enforcement | `rbac.ts`: tier→env→view→tenant pinning; `staffCanMutate` | Cross-tenant leakage = catastrophic |
| Tenant scoping | `assertBrandScope` / `isCrossTenantAccess` / `scopedBrandId` | Brand must never see another brand's data |
| Secrets | `.env` real keys (PRESENT) | Must never print/log/commit (spec §12) |
| Baseline recovery | tag `mercenta-baseline-before-redesign-20260907` + bundle | Recovery point (spec §26) |

## HIGH (broken or risky — document, do not silently redesign)

| Area | Evidence | Finding |
|---|---|---|
| Typecheck red | RESOLVED — `npx tsc --noEmit` exits 0 at HEAD. `outreachGenerator.ts` fixed 2026-09-08; `XeroConnection.tsx` (dead duplicate) REMOVED in Phase 1 (2026-09-16). | No live typecheck defect remains. |
| Brand CRM | Score 4/10 (forensic §9 Flow 4); cramped accordion, 7 sections | Worst UX. Needs structural redesign (spec §35). HIGH risk = don't lose CRM data model. |
| Admin IA | 24 flat nav items; forensic §10 IA issues | Needs grouping (spec §36). |
| Integrations OAuth | `code_received` state ends in limbo — "token exchange pending Edge Function deployment" | Real OAuth never completes end-to-end. Must not pretend it's connected. |
| POs admin/brand | Flow 3 score 5/10; no batch, no inline validation | Complex, easy-error workflow. Redesign with caution. |
| Add Product | Flow 5 score 6/10; cramped dimension grid | Gate-blocked state correct; presentation weak. |

## MODERATE (functional but rough)

- Compliance approvals (Flow 6 6/10; missing batch, audit trail, brand notif)
- Super Admin staff table (raw `<table>`, no confirmations, no search/sort)
- Onboarding wizard (Flow 2 6/10; dense legal text, no progress persistence)
- Loading states — **missing across the app** (forensic §8 CRIT)
- Confirmation dialogs — ad-hoc or absent for destructive ops
- Notification/Toast system — no coherent system (spec §41)

## SAFE (redesign freely, preserve behavior)

- Marketing pages, login/demo flows, home shell
- DataTable primitives, page header pattern
- Single-brand read flows inside one tenant
- Read-only analytics/charts

## Misleading-UI / mock-only flags (must stay honest)

- `usertour` registered `connected + sandbox:true` — correctly labelled Mock in
  UI; keep that truthfulness everywhere.
- `XeroConnection.tsx` dead + broken — do not surface as working.
- **REMOVED in Phase 1 (2026-09-16):** the dead duplicate `XeroConnection.tsx`
  component is deleted (0 importers); Xero lives in `AccountingPanel.tsx`.
- Ensure SIMULATION vs LIVE is visually distinct in Super Admin (spec §78).