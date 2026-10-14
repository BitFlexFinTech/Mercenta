# MERCENTA PRODUCT CONTRACT

> Source of truth for the product's business rules, permissions, terminology,
> and non-negotiable functionality. Derived from repository inspection +
> existing audit docs (AUDIT_REPORT.md, MERCENTA_FORENSIC_AUDIT.md, HANDOFF.md).
> Unknowns marked `UNKNOWN — REQUIRES VERIFICATION`.

## 1. Business model

MERCENTA is an operational platform in which Mercenta acts as a
distributor/vendor operator for independent brands:

```
BRAND → MERCENTA → MERCENTA'S VENDOR OPERATIONS → EXTERNAL CHANNEL / VENDOR SYSTEM
   → ORDERS / FULFILMENT / FINANCE / LOGISTICS / COMPLIANCE
```

The exact legal characterization of the brand↔Mercenta↔vendor relationship is
outside engineering authority. The platform is the operational interface +
orchestration layer between brands and the underlying vendor infrastructure.

**Catalog system (verified in code):** `Product`, `PurchaseOrder` (+
`PurchaseOrderLineItem`), `Shipment`, `ComplianceDocument`, `Contract`,
`FinancialRecord`, `Deduction`, `Ticket`, `StaffMember`, `BrandProfile`,
`AuditLogEntry`, `NotificationPreference`.

## 2. Users & roles

| Role | Tier | Environment(s) | Scope |
|---|---|---|---|
| Brand Partner | `brand` | brand | Pinned to one tenantId; own catalog, POs, shipments, compliance |
| Mercenta Admin (`Mercenta Admin` staff role) | `admin_staff` | admin | Ops views; cannot enter super_admin/integrations views |
| Super Admin | `super_admin` | home, login, brand, admin, carrier | `VIEW_ALLOWLIST = '*'` full access |
| 3PL Carrier | `3pl` | carrier | Only `manifest`, `bak`, `auditor` |

Staff have a permission tier (`full` vs view-only); only `full` + `active`
staff may mutate admin state (`staffCanMutate`).

## 3. Critical workflows (NON-NEGOTIABLE)

1. **Purchase-order acknowledgment** — line-item level (`LineAckStatus`:
   `unacknowledged | accepted | rejected | backordered`). Hard business rule:
   unacknowledged after 24h from receipt = at risk of forced cancellation;
   deadline = `orderDate + 24h`. Rejection uses real Vendor Central codes
   (`TemporarilyUnavailable | InvalidProductIdentifier | ObsoleteProduct`).
   Freight term drives window type: `collect` → ship window; `prepaid` →
   delivery window. PO statuses: `received | under_review | accepted |
   rejected | ready_to_fulfil | shipped | delivered`.
2. **Product onboarding gate** — catalog sync blocked until all compliance
   gate documents approved (`complianceGateStatus`).
3. **Fulfilment track** — stages: `factory_intake → bak_depot →
   international_forwarding → uk_port_hmrc → destination_fc → live_amazon`.
   **§P5 (2026-09-23):** the `mercenta_hub` stage was REMOVED. No channel source
   requires a Mercenta-owned hub and no Mercenta site is ever a destination — the
   destination is the FC **declared on the purchase order**
   (`PurchaseOrder.shipToParty`, the channel's `shipToPartyId`), resolved once by
   `src/config/destinationFc.ts`. `destination_fc` means *arrival at that FC*; a
   PO that declares no ship-to party records an explicit not-declared destination
   and the map draws a schematic leg (never a Mercenta-chosen site).
4. **Onboarding wizard** — 6 steps (Profile → Legal → Banking → Track →
   Agreements → Guidance), including mandatory agreements §4.1 Logistics SLA +
   §4.2 Chargeback Indemnity.
5. **Access gate** — brand application + admin approve/reject/request-info +
   website/Instagram/Facebook link verification.
## 4. Integration model

- Provider-per-integration with SWAPPABLE live/simulated implementation
  (verified precedent: `src/lib/spapi/` — `client.ts` real, `mockClient.ts`
  simulated, `index.ts` factory selecting by connection credentials).
- All integrations in a registry (`src/integrations/registry.ts`),
  state via `IntegrationsContext` with `sandbox` flag. `isConnected()` only
  returns true for non-sandbox, verified connections.
- OAuth via proper popup where supported; API-key via secret field.
- Secrets never persisted plaintext. Currently in-memory/localStorage —
  `UNKNOWN — REQUIRES VERIFICATION` re: Vault-backed store.

## 5. Live / simulation model

- The application must work end-to-end with NO live third-party credentials
  (mock-first). Mock providers share the exact method signatures of real ones.
- Simulation is NOT static demo arrays: it must run the same domain services,
  validation, permissions, state transitions, notifications, audit, and
  integration interfaces as live mode. Seam = the provider implementation.
- Hybrid mode is a supported config (some LIVE, some SIMULATION).

## 6. Permissions (enforced, not just hidden)

- `tierForRole` → `canAccessEnvironment` → `canAccessView` / `VIEW_ALLOWLIST`
  → `filterNavForTier`.
- Tenant scoping: `assertBrandScope(session, rows)` filters rows to pinned
## 8. UI principles

- Premium wholesale-operations platform, not generic SaaS dashboard.
- OpenShip-based light/dark surfaces with a per-theme accent (`bold` keeps its own
  violet-black identity); Plus Jakarta Sans + Fraunces.
- Prioritize exceptions/actions/next-steps over KPI-card walls.
- All screens answer: WHERE AM I? WHAT MATTERS? WHAT HAPPENED? WHAT NEEDS
  ATTENTION? WHAT CAN I DO? WHAT SHOULD I DO NEXT?

## 9. Things NOT to break

Authentication, RBAC tiers + tenant pinning, PO workflow rules (24h deadline,
line-level ack, rejection codes, freight windows), fulfilment stages,
compliance gate, data contracts in `src/types.ts`, API signatures in
`src/data/api.ts`, mock-first capability, approved categories, demo data,
code splitting / performance.

## 10. Legal / external dependencies

- Amazon SP-API not yet available → simulate now, wire later (see
  `docs/INTEGRATIONS.md`).
- Live-capable credentials already present (PRESENT, never printed): Digital
  Ocean, Postmark, Hunter, Firecrawl, PandaDoc, OpenRouter, Instantly,
  Namecheap FTP. Waiting: Amazon SP-API, DHL, Stripe, Xero, Companies House,
  HMRC, Keepa (from HANDOFF).
- All other downstream services (HMRC, Companies House, Wise, Payoneer, DHL,
  etc.) are documented in `docs/INTEGRATIONS.md`; their application appears as
  integrations in the Integrations Hub.
  brand; `isCrossTenantAccess(session, brandId)` detects leakage. Cross-brand
  fetch returns EMPTY (never leaks existence).
- Super-admin-only views gate in AdminShell: `isSuper ? <X/> : <AccessDenied/>`.
- Live-mode RLS (migrations 0001–0008) enforces the same model server-side.

## 7. Terminology rules

- **Public-facing copy:** "UK market", "UK retail channels", "brand
  distribution" only. NEVER public: Amazon, Vendor Central, 1P, VaaS.
- **Internal framing:** "UK Market-as-a-Service" (per HANDOFF).
- No fabricated claims about Amazon partnership/certification/authorization/
  contractual status. Neutral accurate language; mark uncertain copy
  FOR OWNER/LEGAL REVIEW. Do not reproduce Amazon branding/proprietary UI.
- 10 approved product categories, African/Asian brand focus per business docs.
6. **Audit trail** — `AuditLogEntry` exists; audit view in super admin.