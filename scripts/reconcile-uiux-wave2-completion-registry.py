#!/usr/bin/env python3
"""
§UI/UX Wave 2 COMPLETION (2026-09-18) — registry reconciliation helper.

Reproducible, reviewable reconciliation for the finish-and-fix pass:
  * records the RecordDrawer wiring + the record-queue migrations,
  * NARROWS (does not delete) `uiux-wave2-core-surfaces-remaining` to what is
    genuinely still outstanding, with the historical note preserved,
  * records the real defects fixed in this pass,
  * records the Homepage Editor completion.

Run: python3 scripts/reconcile-uiux-wave2-completion-registry.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
REG = ROOT / "requirements-registry.json"
DATE = "2026-09-18"

data = json.loads(REG.read_text())
entries = data["entries"]
by_id = {r["id"]: r for r in entries}

BUILT = "built_and_tested"

ROWS = [
    (
        "uiux-wave2-completion-record-drawer-queues",
        "RecordDrawer is wired into the real record-bearing queues — the established QUEUE -> PREVIEW "
        "-> RECORD/ACT lifecycle. Admin Purchase Orders (preview drawer over the real PO record -> the "
        "EXISTING AdminPurchaseOrderDetail full record page), Compliance Approvals (preview drawer -> "
        "the EXISTING full document preview), Returns Warehouse Tracking (preview drawer + the real "
        "stage-advance action) and the brand Purchase Orders queue (brand-scoped preview drawer -> the "
        "EXISTING inline acknowledgment/ASN workflow). Drawer sections are limited to what each record "
        "type genuinely supports; no fabricated records, fields or empty placeholder sections.",
        "UI/UX Wave 2 completion pass (report section 5)",
        "src/components/admin/AdminPurchaseOrderList.tsx; src/components/admin/ComplianceApprovals.tsx; "
        "src/components/admin/ReturnsTrackingDashboard.tsx; src/components/brand/BrandPurchaseOrders.tsx; "
        "scripts/validate-uiux-redesign.mjs (record-surface contract, 289 PASS); e2e/record-drawer.spec.ts "
        "(8/8 PASS)",
        BUILT,
    ),
    (
        "uiux-wave2-completion-record-queue-workspace-migration",
        "Page-by-page migration of the record-bearing operational queues onto the Wave-2 workspace "
        "architecture (frame -> header -> sticky toolbar with REAL density + filters -> interactive "
        "metric band -> record queue -> context rail): Admin Purchase Orders, Compliance Approvals, "
        "Returns Warehouse Tracking and the brand Purchase Orders queue. Existing functionality, data, "
        "RBAC, tenant isolation, workflows, business rules and simulation behaviour are unchanged.",
        "UI/UX Wave 2 completion pass (report section 4)",
        "the four surfaces above; scripts/validate-uiux-redesign.mjs (workspace-frame/header/metric-band/"
        "density assertions per surface); e2e/record-drawer.spec.ts tests 2-3 (density + filter are REAL); "
        "e2e/status-semantics.spec.ts (canonical status vocabulary preserved); e2e/document-verification.spec.ts",
        BUILT,
    ),
    (
        "uiux-wave2-completion-homepage-editor-visibility-protection",
        "Homepage Editor completed for the Wave-2 visibility/protection sections: the section headings, "
        "subheadings and every point (title + description) are now editable through the SAME draft -> "
        "publish pipeline and the SAME outward-wording lint gate, with an explicit Revert (cancel/reset) "
        "control that re-reads the persisted copy. Each write touches only its own section, so an edit "
        "can never mutate unrelated homepage content.",
        "UI/UX Wave 2 completion pass (report section 11)",
        "src/components/admin/HomepageEditor.tsx; scripts/validate-uiux-redesign.mjs (editor form + revert "
        "assertions); scripts/validate-homepage-editor.mjs (8/8 PASS); e2e/record-drawer.spec.ts tests 7-8 "
        "(edit -> publish -> public homepage; banned wording blocks publishing)",
        BUILT,
    ),
    (
        "uiux-wave2-completion-homepage-content-normalisation",
        "REAL DEFECT FIXED. `fetchHomepageContent()` returned the raw persisted `homepage_content` row, "
        "and migration 001 seeds that row as `'{}'::jsonb`; `Home` reads the content model unguarded, so "
        "a Supabase-configured deployment rendered the public homepage from an empty object and threw. "
        "A single canonical `normaliseHomepageContent()` now merges any persisted payload onto the "
        "canonical default at the one API seam (non-empty values win, otherwise the canonical default; "
        "lists keep only entries with a real title AND description). No new endpoint, no provider call, "
        "no invented content.",
        "UI/UX Wave 2 completion pass (report section 11/12)",
        "src/config/homepageContent.ts (normaliseHomepageContent); src/data/api.ts (the ONE call site); "
        "scripts/validate-uiux-redesign.mjs (normaliser + seam assertions)",
        BUILT,
    ),
    (
        "uiux-wave2-completion-deterministic-returns-forwarding",
        "REAL DEFECT FIXED. The returns warehouse flow generated its forward tracking number with "
        "`Math.floor(1000 + Math.random() * 9000)`, so the same forward produced a different number on "
        "every run — a non-deterministic workflow that could never be reproduced on reload. The suffix is "
        "now derived deterministically from the tracking record's own id. The row click's `selectedId` "
        "state, which was written but never read (a dead interaction), now drives the record drawer, and a "
        "mutation stamp keeps the metric band, filter and drawer reading the CURRENT record after a "
        "stage advance.",
        "UI/UX Wave 2 completion pass (report section 15/18)",
        "src/components/admin/ReturnsTrackingDashboard.tsx; scripts/validate-uiux-redesign.mjs (no "
        "Math.random in code); e2e/record-drawer.spec.ts test 5 (Advance really changes the record)",
        BUILT,
    ),
]

added = 0
for rid, desc, source, evidence, status in ROWS:
    if rid in by_id:
        row = by_id[rid]
        row["description"] = desc
        row["source"] = source
        row["evidence"] = evidence
        row["status"] = status
        row["last_verified"] = DATE
    else:
        entries.append(
            {
                "id": rid,
                "description": desc,
                "source": source,
                "status": status,
                "evidence": evidence,
                "last_verified": DATE,
                "superseded_by": None,
            }
        )
        added += 1

# ── NARROW the remaining-surfaces row (historical record preserved) ──────────
remaining = by_id.get("uiux-wave2-core-surfaces-remaining")
if remaining:
    remaining["description"] = (
        "REMAINING after the Wave-2 completion pass: the NON-record operational surfaces still use their "
        "previous page composition — Marketplace Intelligence (Brand Intelligence / Ad Spend), Finance "
        "(Billing / Accounting), Super Admin and governance (Super Admin / Audit Log / Integrations / "
        "Onboarding Tours), and the admin CRM / catalogue / logistics / communications panels. The "
        "RECORD-BEARING queues were migrated in the completion pass and are tracked by "
        "'uiux-wave2-completion-record-queue-workspace-migration' (no longer listed here)."
    )
    remaining["evidence"] = (
        "scripts/validate-uiux-redesign.mjs; docs/UIUX_REDESIGN_WAVE2_2026-09-18.md; "
        "docs/UIUX_REDESIGN_WAVE2_COMPLETION_2026-09-18.md (remaining-surfaces list)"
    )
    remaining["last_verified"] = DATE
    remaining["_audit_note"] = (
        "Historical record retained: the original row covered 'Brand Operational surfaces, Marketplace "
        "Intelligence, Orders & Distribution lists, Finance, Super Admin, catalogue/logistics/comms "
        "records'. The record-bearing queues (admin + brand Purchase Orders, Compliance Approvals, "
        "Returns Warehouse Tracking) were migrated in the completion pass and are now tracked by their "
        "own rows; this row is narrowed to the surfaces that genuinely remain and is still not_started."
    )

data["_meta"]["total_entries"] = len(entries)
data["_meta"]["last_updated"] = DATE
REG.write_text(json.dumps(data, indent=2) + "\n")
print("registry reconciled (part 1):", len(entries), "entries (+" + str(added) + " new)")