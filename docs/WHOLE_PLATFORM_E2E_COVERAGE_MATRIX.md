# WHOLE-PLATFORM E2E COVERAGE MATRIX

> **GENERATED FILE — do not edit by hand.** The ONE owner is
> `docs/scenario-catalogue.json`; regenerate this document with
> `node scripts/e2e-catalogue.mjs --doc`. The gate `scripts/validate-e2e-scenarios.mjs`
> fails if this document drifts from the owner.

**Scenarios:** 126 · **Capabilities:** 8

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
| commerce_logistics | 23 |
| finance | 7 |
| founder | 5 |
| integrations | 3 |
| onboarding_acquisition | 10 |
| operations | 7 |
| platform | 68 |

## Scenarios

| id | capability | actor | type | spec | proved by (test) |
|---|---|---|---|---|---|
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
