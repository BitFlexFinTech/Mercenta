# WHOLE-PLATFORM E2E COVERAGE MATRIX

> **GENERATED FILE — do not edit by hand.** The ONE owner is
> `docs/scenario-catalogue.json`; regenerate this document with
> `node scripts/e2e-catalogue.mjs --doc`. The gate `scripts/validate-e2e-scenarios.mjs`
> fails if this document drifts from the owner.

**Scenarios:** 220 · **Capabilities:** 8

## The method (the axes that define the space)

A scenario is a cell in the cross-product of an object lifecycle with the axes below; only meaningful cells are listed, and the gate refuses BOTH an orphan test (a spec no scenario names) and a missing one (a scenario whose spec does not exist).

- **object** — PO-line · PO · shipment · ASN · document · invoice · payment · deduction · return · case · compliance_doc · contract · onboarding · payout
- **actor** — brand_user · brand_admin · mercenta_admin · super_admin · channel · carrier · system · public_visitor
- **trigger** — channel_event · brand_action · admin_action · time_deadline · provider_event · system_sweep
- **outcome** — success · refusal · exception · timeout · override
- **data_condition** — complete · incomplete · unknown · conflicting · duplicate
- **tenancy** — own_tenant · cross_tenant_refused
- **provider_mode** — simulation · live · degraded · unknown_refused
- **time** — before_window · at_boundary · past_window

## Coverage by capability

| Capability | Scenarios |
|---|---|
| brands_marketing | 3 |
| commerce_logistics | 69 |
| finance | 7 |
| founder | 5 |
| integrations | 3 |
| onboarding_acquisition | 58 |
| operations | 7 |
| platform | 68 |

## Scenarios

| id | capability | actor | type | spec | proved by (test) |
|---|---|---|---|---|---|
| oa-ack-guidance-admin-preview | onboarding_acquisition | mercenta_admin | happy | `e2e/po-onboarding-ack-surfaces.spec.ts` | `3. the admin tour-management preview shows the OWNER’s rule (never a copy)` |
| oa-ack-guidance-brand-tour | onboarding_acquisition | brand_user | happy | `e2e/po-onboarding-ack-surfaces.spec.ts` | `1. the brand tour step and the KB article it links to teach the OWNER’s rule` |
| oa-ack-guidance-wizard | onboarding_acquisition | brand_admin | happy | `e2e/po-onboarding-ack-surfaces.spec.ts` | `2. the wizard’s operational-guidance step states the OWNER’s rule` |
| oa-ack-pipeline-link-canonical | onboarding_acquisition | mercenta_admin | happy | `e2e/po-onboarding-ack-surfaces.spec.ts` | `4. the admin onboarding pipeline states the LINK for every record it shows` |
| oa-acquisition-pipeline-happy | onboarding_acquisition | mercenta_admin | happy | `e2e/acquisition-pipeline.spec.ts` | `1. Real BI brand → ICP → approval → simulated send → response → opportunity → CRM` |
| oa-acquisition-reject-refusal | onboarding_acquisition | mercenta_admin | refusal | `e2e/acquisition-pipeline.spec.ts` | `2. REJECT is a real, distinct approval outcome on a second real brand` |
| oa-acquisition-relationship-canonical-messages | onboarding_acquisition | mercenta_admin | happy | `e2e/acquisition-pipeline.spec.ts` | `1b. The relationship is visible in the CRM and in the ONE canonical Messages thread` |
| oa-acquisition-tenant-isolation | onboarding_acquisition | brand_user | refusal | `e2e/acquisition-pipeline.spec.ts` | `3. Tenant isolation — a brand session has no acquisition surface and no prospect thread` |
| oa-commercial-model-brand-readonly | onboarding_acquisition | brand_admin | happy | `e2e/commercial-model.spec.ts` | `3. the brand sees its own relationship read-only` |
| oa-commercial-model-change-audited | onboarding_acquisition | super_admin | happy | `e2e/commercial-model.spec.ts` | `2. Super Admin records a model change with a reason, and it is audited` |
| oa-commercial-model-selection-honoured | onboarding_acquisition | super_admin | happy | `e2e/commercial-model.spec.ts` | `1. onboarding offers both models and honours the recorded selection` |
| oa-commercial-readiness-brand-scope | onboarding_acquisition | brand_user | happy | `e2e/commercial-readiness.spec.ts` | `4. the brand sees ONLY its own products, explained in plain language with a guide` |
| oa-commercial-readiness-canonical-products | onboarding_acquisition | super_admin | happy | `e2e/commercial-readiness.spec.ts` | `1. the Control Centre Commercial section shows every canonical product` |
| oa-commercial-readiness-explains-why | onboarding_acquisition | super_admin | happy | `e2e/commercial-readiness.spec.ts` | `2. opening a product explains WHY — the evaluated conditions, the missing information and the canonical work item` |
| oa-commercial-readiness-idempotent | onboarding_acquisition | brand_admin | persistence | `e2e/commercial-readiness.spec.ts` | `5. a REAL brand action changes the product status, a repeat does not, and the journey reaches ready` |
| oa-commercial-readiness-next-stage | onboarding_acquisition | super_admin | happy | `e2e/commercial-readiness.spec.ts` | `6. a product with no outstanding action says so, and its next step is the declared next stage` |
| oa-commercial-readiness-rbac-refusal | onboarding_acquisition | brand_user | refusal | `e2e/commercial-readiness.spec.ts` | `3. RBAC — a brand session never reaches the Founder Control Centre or its commercial data` |
| oa-conversion-gate-duplicate-once | onboarding_acquisition | public_visitor | refusal | `e2e/conversion-gate.spec.ts` | `4. the same application is recorded ONCE, and the second attempt is told so` |
| oa-conversion-gate-field-refusals | onboarding_acquisition | public_visitor | refusal | `e2e/conversion-gate.spec.ts` | `3. invalid answers produce per-field, announced refusals` |
| oa-conversion-gate-honeypot-refusal | onboarding_acquisition | public_visitor | refusal | `e2e/conversion-gate.spec.ts` | `1. a filled honeypot is refused and NOTHING is recorded` |
| oa-conversion-gate-missing-phone-refusal | onboarding_acquisition | public_visitor | refusal | `e2e/conversion-gate.spec.ts` | `3b. a MISSING phone number is refused under the phone control (it is compulsory)` |
| oa-conversion-gate-provider-hang | onboarding_acquisition | public_visitor | happy | `e2e/conversion-gate.spec.ts` | `5. submission never waits for the third-party link check (the hosts hang)` |
| oa-conversion-gate-too-fast-refusal | onboarding_acquisition | public_visitor | refusal | `e2e/conversion-gate.spec.ts` | `2. a submission faster than the declared minimum is refused` |
| oa-discovery-drilldown-filter | onboarding_acquisition | mercenta_admin | happy | `e2e/opportunity-discovery.spec.ts` | `2. clicking an opportunity opens its drill-down, and filtering narrows the list` |
| oa-discovery-potential-only | onboarding_acquisition | mercenta_admin | happy | `e2e/opportunity-discovery.spec.ts` | `3. the sports opportunity is POTENTIAL only and claims no ASIN evidence` |
| oa-discovery-ranked | onboarding_acquisition | mercenta_admin | happy | `e2e/opportunity-discovery.spec.ts` | `1. it renders inside Brand Intelligence with the vertical rollup and a ranked list` |
| oa-handoff-happy | onboarding_acquisition | mercenta_admin | happy | `e2e/onboarding-handoff.spec.ts` | `1. Qualified opportunity → tenant identity → ordered steps → operational brand` |
| oa-handoff-relationship-visible | onboarding_acquisition | mercenta_admin | happy | `e2e/onboarding-handoff.spec.ts` | `2. The hand-off is visible in the Brand CRM relationship record` |
| oa-handoff-tenant-isolation | onboarding_acquisition | brand_user | refusal | `e2e/onboarding-handoff.spec.ts` | `3. A brand tenant session has no acquisition/onboarding surface` |
| oa-uk-market-fit-cta | onboarding_acquisition | public_visitor | happy | `e2e/uk-market-fit.spec.ts` | `1. the homepage carries the primary CTA and Partner Login stays a header utility action` |
| oa-uk-market-fit-deterministic | onboarding_acquisition | public_visitor | persistence | `e2e/uk-market-fit.spec.ts` | `7. a re-run produces the same deterministic result (reset/repeatability)` |
| oa-uk-market-fit-founder-feed | onboarding_acquisition | super_admin | happy | `e2e/uk-market-fit.spec.ts` | `9. a Super Admin sees the assessment and can feed a qualified one into acquisition` |
| oa-uk-market-fit-no-promise | onboarding_acquisition | public_visitor | happy | `e2e/uk-market-fit.spec.ts` | `5. the result carries no prohibited promise and shows the honest disclaimer` |
| oa-uk-market-fit-one-next-step | onboarding_acquisition | public_visitor | happy | `e2e/uk-market-fit.spec.ts` | `6. the result offers ONE next step and an audited review request` |
| oa-uk-market-fit-progressive-steps | onboarding_acquisition | public_visitor | happy | `e2e/uk-market-fit.spec.ts` | `2. the CTA opens the assessment and the four progressive steps render` |
| oa-uk-market-fit-rbac-refusal | onboarding_acquisition | brand_user | refusal | `e2e/uk-market-fit.spec.ts` | `10. RBAC: a brand session never reaches the Control Centre` |
| oa-uk-market-fit-red-lines | onboarding_acquisition | public_visitor | happy | `e2e/uk-market-fit.spec.ts` | `8. the rendered result publishes no red-line claim (read from its owner) and no internal plumbing` |
| oa-uk-market-fit-result-shape | onboarding_acquisition | public_visitor | happy | `e2e/uk-market-fit.spec.ts` | `4. progressive collection reaches the result with 8 sections, 3 indicators and a simulation label` |
| oa-uk-market-fit-validation-refusal | onboarding_acquisition | public_visitor | refusal | `e2e/uk-market-fit.spec.ts` | `3. required validation blocks an incomplete submission and names the fields` |
| oa-wizard-admin-override | onboarding_acquisition | mercenta_admin | happy | `e2e/onboarding.spec.ts` | `6. Admin can override a track with a logged reason` |
| oa-wizard-legal-agreements | onboarding_acquisition | brand_admin | happy | `e2e/onboarding.spec.ts` | `5. Walking to step 5 exposes the mandatory legal agreements` |
| oa-wizard-recommendation-financed | onboarding_acquisition | brand_admin | happy | `e2e/onboarding.spec.ts` | `2. Track recommendation (default) steers to Financed` |
| oa-wizard-step1 | onboarding_acquisition | brand_admin | happy | `e2e/onboarding.spec.ts` | `1. Fresh brand starts onboarding with step 1 visible` |
| oa-wizard-track-options | onboarding_acquisition | brand_admin | happy | `e2e/onboarding.spec.ts` | `4. Step-4 cards expose both track options` |
| oa-wizard-working-capital-direct | onboarding_acquisition | brand_admin | happy | `e2e/onboarding.spec.ts` | `steers to Brand-direct supply` |
| oa-workflow-derived-pipeline | onboarding_acquisition | mercenta_admin | happy | `e2e/onboarding-workflow.spec.ts` | `2. The pipeline is derived (0 when empty) and brand sessions cannot reach it` |
| oa-workflow-manual-creation | onboarding_acquisition | mercenta_admin | happy | `e2e/onboarding-workflow.spec.ts` | `3. Manual creation → canonical record → the brand tenant can enter its portal` |
| oa-workflow-operational | onboarding_acquisition | mercenta_admin | happy | `e2e/onboarding-workflow.spec.ts` | `1. Admin operates an acquisition-origin onboarding to OPERATIONAL in the pipeline` |
| pf-access-gate-admin-sees-application | platform | mercenta_admin | happy | `e2e/access-gate.spec.ts` | `4. Admin sees application` |
| pf-access-gate-approved-into-onboarding | platform | super_admin | happy | `e2e/access-gate.spec.ts` | `6. Admin approves a partner application` |
| pf-access-gate-entry | platform | public_visitor | happy | `e2e/access-gate.spec.ts` | `1. Login page shows Partner Login and Request Partner Access` |
| pf-access-gate-link-required | platform | public_visitor | refusal | `e2e/access-gate.spec.ts` | `2. Application form validates at least one link required` |
| pf-access-gate-rejected | platform | super_admin | refusal | `e2e/access-gate.spec.ts` | `7. Admin rejects brand` |
| pf-access-gate-submitted | platform | public_visitor | happy | `e2e/access-gate.spec.ts` | `3. Application submitted with website link` |
| pf-audit-money-path-entry | platform | super_admin | happy | `e2e/brand-payouts.spec.ts` | `settling a payout reports mock mode, clears it from pending and audits it` |
| pf-audit-on-behalf-attributed | platform | super_admin | happy | `e2e/crm.spec.ts` | `6. On-behalf actions are attributed in the audit log` |
| pf-audit-surface-a11y | platform | super_admin | a11y | `e2e/accessibility.spec.ts` | `4. Audit log is structurally sound and scan-clean` |
| pf-audit-surface-renders | platform | super_admin | happy | `e2e/crm.spec.ts` | `5. Audit log renders` |
| pf-design-system-canonical-kit | platform | super_admin | happy | `e2e/design-system.spec.ts` | `canonical kit renders` |
| pf-design-system-focus-visible | platform | super_admin | a11y | `e2e/design-system.spec.ts` | `focus-visible outline is visible on keyboard focus of a Button` |
| pf-design-system-no-overflow | platform | super_admin | responsive | `e2e/design-system.spec.ts` | `(no horizontal overflow)` |
| pf-public-chrome-footer-categories | platform | public_visitor | happy | `e2e/public-chrome.spec.ts` | `the footer carries the five-column shape` |
| pf-public-cookie-notice-sticky | platform | public_visitor | persistence | `e2e/public-chrome.spec.ts` | `answering the notice STICKS across a reload` |
| pf-public-header-labels-agree | platform | public_visitor | happy | `e2e/public-chrome.spec.ts` | `the footer agrees with them` |
| pf-public-pages-render-shell-noredline | platform | public_visitor | happy | `e2e/public-pages.spec.ts` | `shell and publishes no internal detail` |
| pf-public-stays-public-with-session | platform | public_visitor | happy | `e2e/runtime-entry.spec.ts` | `is still the public marketing homepage` |
| pf-rbac-brand-nav-hidden | platform | brand_user | refusal | `e2e/app-shell.spec.ts` | `Brand — admin-only views hidden; render-side auth intact` |
| pf-rbac-non-super-nav-hidden | platform | mercenta_admin | refusal | `e2e/app-shell.spec.ts` | `Non-super Admin does not see super-only views in the nav` |
| pf-rbac-refused-super-view | platform | mercenta_admin | refusal | `e2e/runtime-entry.spec.ts` | `a tier that may not enter an environment is refused (AccessDenied, not the panel)` |
| pf-runtime-cold-deep-link-addressed | platform | public_visitor | happy | `e2e/runtime-entry.spec.ts` | `a cold product deep link keeps its address and lands on the requested view` |
| pf-session-back-forward | platform | brand_user | persistence | `e2e/runtime-entry.spec.ts` | `Back/Forward move between product views instead of leaving the app` |
| pf-session-refresh-restores | platform | brand_user | persistence | `e2e/runtime-entry.spec.ts` | `F5 in place stays in place (no silent sign-out)` |
| pf-session-removed-address-refused | platform | public_visitor | refusal | `e2e/runtime-entry.spec.ts` | `the removed carrier address fails closed (no carrier shell exists)` |
| pf-session-tamper-fails-closed | platform | system | refusal | `e2e/runtime-entry.spec.ts` | `a tampered or unknown persisted session fails CLOSED` |
| pf-tenant-admin-sees-all-brands | platform | mercenta_admin | happy | `e2e/multi-tenant.spec.ts` | `Admin can see all brands` |
| pf-tenant-carrier-console-admin-only | platform | brand_user | refusal | `e2e/multi-tenant.spec.ts` | `the carrier tenant is gone and the carrier console is admin-only` |
| pf-tenant-messages-scoped | platform | brand_user | refusal | `e2e/multi-tenant.spec.ts` | `Brand A cannot see Brand B messages` |
| pf-tenant-payout-ledger-scoped | platform | brand_user | refusal | `e2e/multi-tenant.spec.ts` | `payout ledger is tenant-scoped` |
| pf-tenant-pos-scoped | platform | brand_user | refusal | `e2e/multi-tenant.spec.ts` | `Brand A cannot see Brand B POs` |
| po-ack-duty-completeness | commerce_logistics | brand_user | happy | `e2e/po-ack-duties.spec.ts` | `2. the panel states the completeness rule, and the verdict is real data` |
| po-ack-duty-omitted-lines-conditional | commerce_logistics | brand_user | happy | `e2e/po-ack-duties.spec.ts` | `3. the omitted-lines notice appears ONLY when the record carries that fact` |
| po-ack-duty-on-hold | commerce_logistics | brand_user | happy | `e2e/po-ack-duties.spec.ts` | `1. the panel states the channel’s on-hold duty, or says it is unverified` |
| po-ack-duty-submission-recorded | commerce_logistics | brand_user | happy | `e2e/po-ack-duties.spec.ts` | `4. a submission through the real surface is recorded and the rules survive it` |
| po-ack-price-above-refused | commerce_logistics | brand_user | refusal | `e2e/ack-invoice-price.spec.ts` | `1. a price ABOVE the order price is refused with the channel rule` |
| po-ack-price-lower-accepted | commerce_logistics | brand_user | happy | `e2e/ack-invoice-price.spec.ts` | `2. a LOWER acknowledged price is accepted, warned, and shown on the order` |
| po-admin-ack-decided-no-dead-accept | commerce_logistics | mercenta_admin | refusal | `e2e/po-admin-ack-surface.spec.ts` | `3. a decided order states the owner’s reason and offers no dead acceptance` |
| po-admin-ack-detail-window-classification | commerce_logistics | mercenta_admin | happy | `e2e/po-admin-ack-surface.spec.ts` | `2. the detail is the owner’s window, its classification, and the acceptance it permits` |
| po-admin-ack-list-window-owner | commerce_logistics | mercenta_admin | happy | `e2e/po-admin-ack-surface.spec.ts` | `1. the list and its record preview present the window from its owner` |
| po-brand-ack-amend-in-window | commerce_logistics | brand_user | happy | `e2e/po-brand-ack-surface.spec.ts` | `4. an acknowledged order can be AMENDED inside the update window` |
| po-brand-ack-closing-both-options | commerce_logistics | brand_user | happy | `e2e/po-brand-ack-surface.spec.ts` | `3. the closing window offers BOTH the brand’s own decision and Mercenta’s draft` |
| po-brand-ack-panel-window | commerce_logistics | brand_user | happy | `e2e/po-brand-ack-surface.spec.ts` | `2. the acknowledgement panel states the window the decision is made inside` |
| po-brand-ack-window-owner | commerce_logistics | brand_user | happy | `e2e/po-brand-ack-surface.spec.ts` | `1. the window is presented from its owner — due/urgent, never overdue or NaN` |
| po-doc-carrier-label-downloads | commerce_logistics | mercenta_admin | happy | `e2e/po-documents.spec.ts` | `10. the carrier label dialogue DOWNLOADS the label it renders (owner D3)` |
| po-doc-download-real-files | commerce_logistics | mercenta_admin | happy | `e2e/po-documents.spec.ts` | `9. a ready document and the whole pack DOWNLOAD as real files beside Open/Print` |
| po-doc-freight-collect-no-arn | commerce_logistics | mercenta_admin | refusal | `e2e/po-documents.spec.ts` | `5. a Freight Collect lane shows the documented chain, and never fabricates an ARN` |
| po-doc-hub-queue-open-pack | commerce_logistics | mercenta_admin | happy | `e2e/po-documents.spec.ts` | `7. the accepted PO is in the Hub queue and opens its pack without selecting a consignment` |
| po-doc-one-renderer | commerce_logistics | mercenta_admin | happy | `e2e/po-documents.spec.ts` | `6. the pack opens the EXISTING carrier-label dialogue (one renderer per artefact)` |
| po-doc-pack-on-hub | commerce_logistics | mercenta_admin | happy | `e2e/po-documents.spec.ts` | `1. the pack appears on the Logistics Hub for an accepted PO, and names the PO declared FC` |
| po-doc-queue-badge-notification | commerce_logistics | mercenta_admin | happy | `e2e/po-documents.spec.ts` | `4. the nav badge and the notification centre carry the document download queue` |
| po-doc-queue-count-same-rule | commerce_logistics | mercenta_admin | happy | `e2e/po-documents.spec.ts` | `8. the queue count is the SAME rule the nav badge counts` |
| po-doc-readiness-honest | commerce_logistics | mercenta_admin | happy | `e2e/po-documents.spec.ts` | `2. readiness is honest: SSCC labels ready, the waybill NOT (with its reason)` |
| po-doc-sscc-labels | commerce_logistics | mercenta_admin | happy | `e2e/po-documents.spec.ts` | `3. the SSCC carton labels open with one 18-digit identifier per carton` |
| po-ingest-channel-read-entry | commerce_logistics | mercenta_admin | happy | `e2e/channel-po-ingestion.spec.ts` | `1. the create action is gone and the channel read is the entry point` |
| po-ingest-filed-opens-record | commerce_logistics | mercenta_admin | happy | `e2e/channel-po-ingestion.spec.ts` | `5. a filed channel PO opens its real record` |
| po-ingest-reread-idempotent | commerce_logistics | mercenta_admin | persistence | `e2e/channel-po-ingestion.spec.ts` | `4. a re-read files nothing new (the guard is on by default)` |
| po-ingest-routable-filed-out-of-catalogue-refused | commerce_logistics | mercenta_admin | refusal | `e2e/channel-po-ingestion.spec.ts` | `3. routable POs are filed against the brand; the out-of-catalogue PO is REFUSED with its reason` |
| po-ingest-simulated-provenance | commerce_logistics | mercenta_admin | happy | `e2e/channel-po-ingestion.spec.ts` | `2. the read states its simulated provenance and its outcome counts` |
| po-lifecycle-accept-all | commerce_logistics | brand_user | happy | `e2e/po-lifecycle.spec.ts` | `1. Accept all lines -> status updates, window appears` |
| po-lifecycle-backorder-keeps-open | commerce_logistics | brand_user | happy | `e2e/po-lifecycle.spec.ts` | `3. Backorder line -> scheduled ship date keeps the PO open` |
| po-lifecycle-over-ack-blocked | commerce_logistics | brand_user | refusal | `e2e/po-lifecycle.spec.ts` | `5. Ack qty exceeds ordered qty -> blocked` |
| po-lifecycle-partial-ack | commerce_logistics | brand_user | happy | `e2e/po-lifecycle.spec.ts` | `4. Partial ack: accept one line, reject the other` |
| po-lifecycle-reject-line-reason | commerce_logistics | brand_user | refusal | `e2e/po-lifecycle.spec.ts` | `2. Reject a line with a reason code` |
| po-lifecycle-window-truthful | commerce_logistics | brand_user | boundary | `e2e/po-lifecycle.spec.ts` | `6. the 24-hour window is rendered truthfully — no open PO is falsely overdue` |
| po-notify-brand-reminders | commerce_logistics | brand_user | happy | `e2e/po-notification-fanout.spec.ts` | `2. the brand sees the reminders Mercenta actually sent it` |
| po-notify-fanout-founder | commerce_logistics | super_admin | happy | `e2e/po-notification-fanout.spec.ts` | `1. the founder runs the fan-out and reads what was delivered, refused and drafted` |
| po-onbehalf-console-override-attributed | commerce_logistics | mercenta_admin | happy | `e2e/po-onbehalf.spec.ts` | `3. Mercenta’s console sees the SAME draft and records an attributed override` |
| po-onbehalf-draft-approved | commerce_logistics | brand_user | happy | `e2e/po-onbehalf.spec.ts` | `1. the brand reads Mercenta’s draft for the on-behalf PO and approves it` |
| po-onbehalf-not-offered-mid-window | commerce_logistics | brand_user | refusal | `e2e/po-onbehalf.spec.ts` | `2. the draft is NOT offered for a purchase order still in the middle of its window` |
| po-onboard-admin-pipeline-link | commerce_logistics | mercenta_admin | happy | `e2e/po-onboarding-ack-surfaces.spec.ts` | `4. the admin onboarding pipeline states the LINK for every record it shows` |
| po-onboard-admin-tour-preview-owner-rule | commerce_logistics | mercenta_admin | happy | `e2e/po-onboarding-ack-surfaces.spec.ts` | `3. the admin tour-management preview shows the OWNER’s rule (never a copy)` |
| po-onboard-tour-kb-owner-rule | commerce_logistics | brand_user | happy | `e2e/po-onboarding-ack-surfaces.spec.ts` | `1. the brand tour step and the KB article it links to teach the OWNER’s rule` |
| po-onboard-wizard-guidance-owner-rule | commerce_logistics | brand_admin | happy | `e2e/po-onboarding-ack-surfaces.spec.ts` | `2. the wizard’s operational-guidance step states the OWNER’s rule` |
| po-revision-brand-notified | commerce_logistics | brand_user | happy | `e2e/po-revision-surfaces.spec.ts` | `3. the brand is told the channel changed its order, and what changed` |
| po-revision-console-change-list | commerce_logistics | mercenta_admin | happy | `e2e/po-revision-surfaces.spec.ts` | `2. the console shows every recorded revision with its change list` |
| po-revision-refused-until-read | commerce_logistics | mercenta_admin | refusal | `e2e/po-revision-surfaces.spec.ts` | `1. the simulated change is refused until the channel has been read` |
| spec-access-gate | platform | mixed | happy | `e2e/access-gate.spec.ts` | — |
| spec-accessibility | platform | mixed | happy | `e2e/accessibility.spec.ts` | — |
| spec-ack-invoice-price | commerce_logistics | mixed | happy | `e2e/ack-invoice-price.spec.ts` | — |
| spec-acquisition-pipeline | onboarding_acquisition | mixed | happy | `e2e/acquisition-pipeline.spec.ts` | — |
| spec-admin-operational-surfaces | platform | mixed | happy | `e2e/admin-operational-surfaces.spec.ts` | — |
| spec-amazon-ads-dashboard | brands_marketing | mixed | happy | `e2e/amazon-ads-dashboard.spec.ts` | — |
| spec-app-shell | platform | mixed | happy | `e2e/app-shell.spec.ts` | — |
| spec-bi-intelligence-preservation | platform | mixed | happy | `e2e/bi-intelligence-preservation.spec.ts` | — |
| spec-billing | finance | mixed | happy | `e2e/billing.spec.ts` | — |
| spec-brand-advertising | platform | mixed | happy | `e2e/brand-advertising.spec.ts` | — |
| spec-brand-case-workflow | operations | mixed | happy | `e2e/brand-case-workflow.spec.ts` | — |
| spec-brand-intelligence-lifecycle | brands_marketing | mixed | happy | `e2e/brand-intelligence-lifecycle.spec.ts` | — |
| spec-brand-operational-surfaces | platform | mixed | happy | `e2e/brand-operational-surfaces.spec.ts` | — |
| spec-brand-payouts | finance | mixed | happy | `e2e/brand-payouts.spec.ts` | — |
| spec-canonical-propagation | platform | mixed | happy | `e2e/canonical-propagation.spec.ts` | — |
| spec-catalog-product-management | commerce_logistics | mixed | happy | `e2e/catalog-product-management.spec.ts` | — |
| spec-channel-po-ingestion | commerce_logistics | mixed | happy | `e2e/channel-po-ingestion.spec.ts` | — |
| spec-command-centre | operations | mixed | happy | `e2e/command-centre.spec.ts` | — |
| spec-commerce-operational-simulation | platform | mixed | happy | `e2e/commerce-operational-simulation.spec.ts` | — |
| spec-commercial-model | onboarding_acquisition | mixed | happy | `e2e/commercial-model.spec.ts` | — |
| spec-commercial-readiness | onboarding_acquisition | mixed | happy | `e2e/commercial-readiness.spec.ts` | — |
| spec-company-control-centre | founder | mixed | happy | `e2e/company-control-centre.spec.ts` | — |
| spec-compliance-gate | commerce_logistics | mixed | happy | `e2e/compliance-gate.spec.ts` | — |
| spec-compliance-sim | commerce_logistics | mixed | happy | `e2e/compliance-sim.spec.ts` | — |
| spec-conversion-gate | onboarding_acquisition | mixed | happy | `e2e/conversion-gate.spec.ts` | — |
| spec-crm | brands_marketing | mixed | happy | `e2e/crm.spec.ts` | — |
| spec-dashboard | platform | mixed | happy | `e2e/dashboard.spec.ts` | — |
| spec-deductions | finance | mixed | happy | `e2e/deductions.spec.ts` | — |
| spec-delivery-appointment | commerce_logistics | mixed | happy | `e2e/delivery-appointment.spec.ts` | — |
| spec-design-system | platform | mixed | happy | `e2e/design-system.spec.ts` | — |
| spec-deterministic-journey | platform | mixed | happy | `e2e/deterministic-journey.spec.ts` | — |
| spec-disputes | finance | mixed | happy | `e2e/disputes.spec.ts` | — |
| spec-document-verification | platform | mixed | happy | `e2e/document-verification.spec.ts` | — |
| spec-domain-acceptance | platform | mixed | happy | `e2e/domain-acceptance.spec.ts` | — |
| spec-domain-persistence | platform | mixed | happy | `e2e/domain-persistence.spec.ts` | — |
| spec-embedded-social | integrations | mixed | happy | `e2e/embedded-social.spec.ts` | — |
| spec-founder-investor-centre | founder | mixed | happy | `e2e/founder-investor-centre.spec.ts` | — |
| spec-founder-operating-system | founder | mixed | happy | `e2e/founder-operating-system.spec.ts` | — |
| spec-fulfillment-tracks | commerce_logistics | mixed | happy | `e2e/fulfillment-tracks.spec.ts` | — |
| spec-funding-pipeline | founder | mixed | happy | `e2e/funding-pipeline.spec.ts` | — |
| spec-google-setup | integrations | mixed | happy | `e2e/google-setup.spec.ts` | — |
| spec-homepage-editor | platform | mixed | happy | `e2e/homepage-editor.spec.ts` | — |
| spec-integration-hub | integrations | mixed | happy | `e2e/integration-hub.spec.ts` | — |
| spec-inventory | commerce_logistics | mixed | happy | `e2e/inventory.spec.ts` | — |
| spec-investor-demo | founder | mixed | happy | `e2e/investor-demo.spec.ts` | — |
| spec-invoicing | finance | mixed | happy | `e2e/invoicing.spec.ts` | — |
| spec-launch-centre | platform | mixed | happy | `e2e/launch-centre.spec.ts` | — |
| spec-legal-agreements | platform | mixed | happy | `e2e/legal-agreements.spec.ts` | — |
| spec-listing-analyzer | platform | mixed | happy | `e2e/listing-analyzer.spec.ts` | — |
| spec-logistics-hero | commerce_logistics | mixed | happy | `e2e/logistics-hero.spec.ts` | — |
| spec-logistics-hub-map | commerce_logistics | mixed | happy | `e2e/logistics-hub-map.spec.ts` | — |
| spec-logistics-providers | commerce_logistics | mixed | happy | `e2e/logistics-providers.spec.ts` | — |
| spec-logistics-wave3 | commerce_logistics | mixed | happy | `e2e/logistics-wave3.spec.ts` | — |
| spec-mercenta-brain | operations | mixed | happy | `e2e/mercenta-brain.spec.ts` | — |
| spec-multi-tenant | platform | mixed | happy | `e2e/multi-tenant.spec.ts` | — |
| spec-notifications | operations | mixed | happy | `e2e/notifications.spec.ts` | — |
| spec-onboarding | onboarding_acquisition | mixed | happy | `e2e/onboarding.spec.ts` | — |
| spec-onboarding-handoff | onboarding_acquisition | mixed | happy | `e2e/onboarding-handoff.spec.ts` | — |
| spec-onboarding-workflow | onboarding_acquisition | mixed | happy | `e2e/onboarding-workflow.spec.ts` | — |
| spec-operating-costs | finance | mixed | happy | `e2e/operating-costs.spec.ts` | — |
| spec-opportunity-discovery | onboarding_acquisition | mixed | happy | `e2e/opportunity-discovery.spec.ts` | — |
| spec-outreach-provider-hardening | platform | mixed | happy | `e2e/outreach-provider-hardening.spec.ts` | — |
| spec-p12-channel-operations | platform | mixed | happy | `e2e/p12-channel-operations.spec.ts` | — |
| spec-po-ack-duties | commerce_logistics | mixed | happy | `e2e/po-ack-duties.spec.ts` | — |
| spec-po-admin-ack-surface | commerce_logistics | mixed | happy | `e2e/po-admin-ack-surface.spec.ts` | — |
| spec-po-brand-ack-surface | commerce_logistics | mixed | happy | `e2e/po-brand-ack-surface.spec.ts` | — |
| spec-po-documents | commerce_logistics | mixed | happy | `e2e/po-documents.spec.ts` | — |
| spec-po-lifecycle | commerce_logistics | mixed | happy | `e2e/po-lifecycle.spec.ts` | — |
| spec-po-notification-fanout | commerce_logistics | mixed | happy | `e2e/po-notification-fanout.spec.ts` | — |
| spec-po-onbehalf | commerce_logistics | mixed | happy | `e2e/po-onbehalf.spec.ts` | — |
| spec-po-onboarding-ack-surfaces | onboarding_acquisition | mixed | happy | `e2e/po-onboarding-ack-surfaces.spec.ts` | — |
| spec-po-revision-surfaces | commerce_logistics | mixed | happy | `e2e/po-revision-surfaces.spec.ts` | — |
| spec-proxy-model | platform | mixed | happy | `e2e/proxy-model.spec.ts` | — |
| spec-public-chrome | platform | mixed | happy | `e2e/public-chrome.spec.ts` | — |
| spec-public-pages | platform | mixed | happy | `e2e/public-pages.spec.ts` | — |
| spec-rakazo | platform | mixed | happy | `e2e/rakazo.spec.ts` | — |
| spec-record-drawer | platform | mixed | happy | `e2e/record-drawer.spec.ts` | — |
| spec-redesign-surfaces | platform | mixed | happy | `e2e/redesign-surfaces.spec.ts` | — |
| spec-retired-platforms | platform | mixed | happy | `e2e/retired-platforms.spec.ts` | — |
| spec-runtime-entry | platform | mixed | happy | `e2e/runtime-entry.spec.ts` | — |
| spec-sales-estimator | platform | mixed | happy | `e2e/sales-estimator.spec.ts` | — |
| spec-seo-foundation | platform | mixed | happy | `e2e/seo-foundation.spec.ts` | — |
| spec-shipment-asn | commerce_logistics | mixed | happy | `e2e/shipment-asn.spec.ts` | — |
| spec-simulation-control | platform | mixed | happy | `e2e/simulation-control.spec.ts` | — |
| spec-status-semantics | platform | mixed | happy | `e2e/status-semantics.spec.ts` | — |
| spec-supply-route-escalation | commerce_logistics | mixed | happy | `e2e/supply-route-escalation.spec.ts` | — |
| spec-table-migrations | platform | mixed | happy | `e2e/table-migrations.spec.ts` | — |
| spec-table-responsive | commerce_logistics | mixed | happy | `e2e/table-responsive.spec.ts` | — |
| spec-tours | operations | mixed | happy | `e2e/tours.spec.ts` | — |
| spec-uiux-foundation | platform | mixed | happy | `e2e/uiux-foundation.spec.ts` | — |
| spec-uiux-redesign | platform | mixed | happy | `e2e/uiux-redesign.spec.ts` | — |
| spec-uk-market-fit | onboarding_acquisition | mixed | happy | `e2e/uk-market-fit.spec.ts` | — |
| spec-work-layer | operations | mixed | happy | `e2e/work-layer.spec.ts` | — |
| spec-workstream-b-intelligence | operations | mixed | happy | `e2e/workstream-b-intelligence.spec.ts` | — |
| spec-xero | finance | mixed | happy | `e2e/xero.spec.ts` | — |
