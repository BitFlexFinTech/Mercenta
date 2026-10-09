# WHOLE-PLATFORM E2E COVERAGE MATRIX

> **GENERATED FILE — do not edit by hand.** The ONE owner is
> `docs/scenario-catalogue.json`; regenerate this document with
> `node scripts/e2e-catalogue.mjs --doc`. The gate `scripts/validate-e2e-scenarios.mjs`
> fails if this document drifts from the owner.

**Scenarios:** 441 · **Capabilities:** 8

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
| commerce_logistics | 142 |
| finance | 32 |
| founder | 49 |
| integrations | 22 |
| onboarding_acquisition | 58 |
| operations | 57 |
| platform | 78 |

## Scenarios

| id | capability | actor | type | spec | proved by (test) |
|---|---|---|---|---|---|
| co-admin-approvals-rows | commerce_logistics | mercenta_admin | happy | `e2e/compliance-gate.spec.ts` | `4. Admin Compliance Approvals renders doc rows` |
| co-admin-compliance-page | platform | mercenta_admin | happy | `e2e/legal-agreements.spec.ts` | `3. Admin Compliance page renders` |
| co-agreements-admin-crm-tab | platform | mercenta_admin | happy | `e2e/legal-agreements.spec.ts` | `2. Admin CRM shows agreement section tab` |
| co-agreements-continue-gated | platform | brand_user | happy | `e2e/legal-agreements.spec.ts` | `1. Brand sees agreement sections and Continue disabled until both accepted` |
| co-brand-upload-reflects-immediately | commerce_logistics | brand_user | happy | `e2e/compliance-gate.spec.ts` | `5. brand document Upload reflects immediately (no reload, no approval)` |
| co-docverif-automated-verdict | platform | mercenta_admin | happy | `e2e/document-verification.spec.ts` | `1. automated verification records a real verdict (simulated provider)` |
| co-docverif-conditional-label | platform | brand_user | happy | `e2e/document-verification.spec.ts` | `6. the conditional category requirement is labelled as conditional` |
| co-docverif-manual-approval | platform | mercenta_admin | happy | `e2e/document-verification.spec.ts` | `3. a manual approval still names the operator and the manual method` |
| co-docverif-manual-rejection | platform | mercenta_admin | happy | `e2e/document-verification.spec.ts` | `2. manual rejection is recorded with the operator as the verifier` |
| co-docverif-rejected-reason-replace | platform | brand_user | happy | `e2e/document-verification.spec.ts` | `5. a rejected document shows its failure reason and a Replace action` |
| co-docverif-submission-not-approved | platform | brand_user | happy | `e2e/document-verification.spec.ts` | `4. a submission becomes "under review" and is never auto-approved` |
| co-gate-blocked-zero-docs | commerce_logistics | brand_user | refusal | `e2e/compliance-gate.spec.ts` | `1. 0/4 docs -> catalog blocked` |
| co-gate-cleared-enables-catalog | commerce_logistics | brand_user | happy | `e2e/compliance-gate.spec.ts` | `3. 4/4 docs + signed/active contract -> catalog enabled` |
| co-gate-tenant-blocked-document-state | commerce_logistics | brand_user | refusal | `e2e/compliance-gate.spec.ts` | `2. a tenant blocked by its document state cannot use the catalog` |
| co-sim-providers-zero-network | commerce_logistics | super_admin | happy | `e2e/compliance-sim.spec.ts` | `Companies House verify + HMRC sync/file run with zero network calls` |
| fi-billing-invoice-fee-commissions | finance | mercenta_admin | happy | `e2e/billing.spec.ts` | `1. Invoice: monthly fee + commissions` |
| fi-billing-remittance-net | finance | mercenta_admin | happy | `e2e/billing.spec.ts` | `2. Remittance: gross - commission - deductions = net` |
| fi-billing-shipping-margin | finance | mercenta_admin | happy | `e2e/billing.spec.ts` | `4. Shipping margin: carrier cost vs. marked-up price` |
| fi-billing-stripe-mock-honest | finance | mercenta_admin | happy | `e2e/billing.spec.ts` | `3. Mock-Stripe mode rendered honestly` |
| fi-costs-ai-ceilings | finance | super_admin | happy | `e2e/operating-costs.spec.ts` | `2. the AI section shows the policy model, ceilings and cost protection` |
| fi-costs-pricing-founder-gated | finance | super_admin | happy | `e2e/operating-costs.spec.ts` | `3. pricing stays unset + founder-gated, and the break-even figure is derived` |
| fi-costs-providers-honest | finance | super_admin | happy | `e2e/operating-costs.spec.ts` | `1. it renders the provider lines, labels and the honest disclaimer` |
| fi-deduction-ledger-categories | finance | mercenta_admin | happy | `e2e/deductions.spec.ts` | `Deduction category: ${dtype} appears in ledger with amount/status` |
| fi-dispute-audited | finance | super_admin | happy | `e2e/disputes.spec.ts` | `5. Dispute write is recorded in the Admin Audit Log` |
| fi-dispute-lost-stands | finance | mercenta_admin | happy | `e2e/disputes.spec.ts` | `3. Outcome: lost -> stands` |
| fi-dispute-open-marks-disputed | finance | mercenta_admin | happy | `e2e/disputes.spec.ts` | `1. Open dispute marks the deduction disputed` |
| fi-dispute-resolution-controls | finance | mercenta_admin | happy | `e2e/disputes.spec.ts` | `4. Disputed deduction exposes the won/partial/lost resolution controls` |
| fi-dispute-won-zeroed | finance | mercenta_admin | happy | `e2e/disputes.spec.ts` | `2. Outcome: won -> zeroed` |
| fi-invoice-cancel-reissue-new-number | finance | super_admin | happy | `e2e/invoicing.spec.ts` | `2. admin: a wrong invoice is cancelled and re-issued under a NEW number (AV-022)` |
| fi-invoice-receipt-gate-registry | finance | super_admin | refusal | `e2e/invoicing.spec.ts` | `3. the receipt gate and the number registry are enforced in the LIVE build` |
| fi-invoice-terms-due-date | finance | super_admin | happy | `e2e/invoicing.spec.ts` | `1. admin: the terms are chosen per invoice and the derived due date follows them` |
| fi-payout-pending-derived | finance | super_admin | happy | `e2e/brand-payouts.spec.ts` | `1. pending payouts are derived from the canonical commission store` |
| fi-payout-reconciled-identity | finance | super_admin | happy | `e2e/brand-payouts.spec.ts` | `3. a reconciled PO shows the payment identity that reconciled it` |
| fi-payout-refused-condition | finance | super_admin | refusal | `e2e/brand-payouts.spec.ts` | `4. a payout that fails a condition is refused with its recorded reason` |
| fi-payout-settle-mock-audited | finance | super_admin | happy | `e2e/brand-payouts.spec.ts` | `2. settling a payout reports mock mode, clears it from pending and audits it` |
| fi-xero-connection-control | finance | super_admin | happy | `e2e/xero.spec.ts` | `5. Connection status or credentials control present` |
| fi-xero-credentials-form | finance | super_admin | happy | `e2e/xero.spec.ts` | `2. "Enter Xero Credentials" form appears` |
| fi-xero-financial-summary | finance | super_admin | happy | `e2e/xero.spec.ts` | `3. Financial Summary section renders` |
| fi-xero-not-connected | finance | super_admin | happy | `e2e/xero.spec.ts` | `1. Accounting tab shows "Not Connected" state` |
| fi-xero-summary-placeholder | finance | super_admin | happy | `e2e/xero.spec.ts` | `4. Summary shows placeholder when not connected` |
| fo-company-approval-gate-refusal | founder | super_admin | refusal | `e2e/company-control-centre.spec.ts` | `3. the approval gate and the no-filing-channel refusal are real` |
| fo-company-credential-masked | founder | super_admin | happy | `e2e/company-control-centre.spec.ts` | `4. a government credential is stored as a mask and never rendered in full` |
| fo-company-identity-honest | founder | super_admin | happy | `e2e/company-control-centre.spec.ts` | `1. it renders the company identity, the unread register and the honest notices` |
| fo-company-read-register-simulated | founder | super_admin | happy | `e2e/company-control-centre.spec.ts` | `2. reading the register performs a real (simulated, labelled) registrar read` |
| fo-demo-25-stage-lifecycle | founder | super_admin | happy | `e2e/investor-demo.spec.ts` | `1. the full 25-stage lifecycle runs in the browser and every stage reports OK` |
| fo-demo-accessible-names | founder | super_admin | happy | `e2e/investor-demo.spec.ts` | `7. accessibility: real accessible names, and status is never colour-only` |
| fo-demo-deterministic-replay | founder | super_admin | happy | `e2e/investor-demo.spec.ts` | `3. reset → replay reproduces the same digest (deterministic)` |
| fo-demo-failure-drills-recovered | founder | super_admin | happy | `e2e/investor-demo.spec.ts` | `6. the deterministic failure drills are executed and recovered` |
| fo-demo-rbac-non-super-admin | founder | mercenta_admin | refusal | `e2e/investor-demo.spec.ts` | `5. a non-Super-Admin session cannot reach the investor demo controls` |
| fo-demo-responsive-no-overflow | founder | super_admin | happy | `e2e/investor-demo.spec.ts` | `the investor demo surface runs with no horizontal overflow` |
| fo-demo-tenant-isolation-rbac | founder | super_admin | refusal | `e2e/investor-demo.spec.ts` | `4. brand-pinned actors are refused cross-tenant and operator-only actions IN THE DOMAIN` |
| fo-demo-zero-external-calls | founder | super_admin | happy | `e2e/investor-demo.spec.ts` | `2. a completed run makes no external provider call` |
| fo-funding-approval-gate | founder | super_admin | refusal | `e2e/funding-pipeline.spec.ts` | `3. the approval gate is real: no approval ⇒ no recorded submission` |
| fo-funding-draft-not-submitted | founder | super_admin | happy | `e2e/funding-pipeline.spec.ts` | `2. generation produces a NOT SUBMITTED draft that passed the wording gate` |
| fo-funding-real-opportunities | founder | super_admin | happy | `e2e/funding-pipeline.spec.ts` | `1. the three REAL opportunities render with their real urls and honest labels` |
| fo-investor-centre-super-admin | founder | super_admin | happy | `e2e/founder-investor-centre.spec.ts` | `1. the Super Admin gets pitches, questions, practice and generated artefacts` |
| fo-investor-rbac-non-super-admin | founder | mercenta_admin | refusal | `e2e/founder-investor-centre.spec.ts` | `3. a non-Super-Admin account never sees the private founder surfaces` |
| fo-os-acquisition-intelligence-never-fabricate | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `23. the acquisition intelligence renders on the Business view with the never-fabricate rule enforced` |
| fo-os-acquisition-pipeline | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `4. the acquisition pipeline renders all eleven lifecycle stages` |
| fo-os-ai-truthful-no-provider | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `3. Founder Ops AI tells the truth when no provider is configured` |
| fo-os-amazon-governance-fail-closed | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `19. the Amazon relationship governance renders with the fail-closed rule enforced` |
| fo-os-automation-catalogue | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `2. the automation catalogue is real — run, suppress, fail, retry, disable` |
| fo-os-capital-requirement | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `7. the Model B capital requirement renders on the Finance view` |
| fo-os-contextual-education | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `13. the contextual education renders with the Knowledge Base link` |
| fo-os-country-framework | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `10. the country framework renders with Zimbabwe never a marketplace` |
| fo-os-credential-vault-durability | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `26. the credential vault renders with the durability rule enforced` |
| fo-os-financier-lifecycle | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `15. the financier lifecycle renders with ACTIVE requiring a completed PILOT` |
| fo-os-financier-universe-evidence | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `22. the financier universe renders on the Finance view with the source-evidence rule enforced` |
| fo-os-financing-routes | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `9. the financing routes render on the Finance view` |
| fo-os-founder-intelligence | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `20. the founder intelligence section renders on the Business view` |
| fo-os-global-halt | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `6. the global halt stops every automation and is honestly reported` |
| fo-os-integrated-loop-forward-only | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `21. the integrated loop renders on the Business view with the forward-only rule enforced` |
| fo-os-learning-loop | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `11. the brand learning loop renders with VALIDATE as the gate` |
| fo-os-localisation-seo-fail-closed | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `18. the localization / SEO / hreflang framework renders with the fail-closed rule enforced` |
| fo-os-object-resolution | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `8. the object resolution renders on the Operations view` |
| fo-os-onboarding-curriculum | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `12. the onboarding academy curriculum renders with the readiness rule` |
| fo-os-outreach-forward-only | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `17. the founder outreach pipeline renders with the forward-only rule enforced` |
| fo-os-pitch-workspace | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `16. the pitch workspace renders with financials staying deterministic` |
| fo-os-rbac-non-super-admin | founder | mercenta_admin | refusal | `e2e/founder-operating-system.spec.ts` | `5. a non-Super-Admin session never reaches the Control Centre` |
| fo-os-shared-workflows | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `14. the shared workflows render with one automation for three consumers` |
| fo-os-ten-views-canonical | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `1. renders the ten operating views over real canonical figures` |
| fo-os-tutorial-recordings | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `25. the tutorial recordings render with the versioning rule enforced` |
| fo-os-uk-opportunity-states-evidence | founder | super_admin | happy | `e2e/founder-operating-system.spec.ts` | `24. the UK opportunity states render on the Business view with the evidence rule enforced` |
| fo-partnerships-send-simulated | founder | super_admin | happy | `e2e/founder-investor-centre.spec.ts` | `2. partnerships generate and SEND explicitly through the simulated seam` |
| in-google-setup-bad-client-id | integrations | super_admin | refusal | `e2e/google-setup.spec.ts` | `3. an implausible OAuth client id is refused before any Google window opens` |
| in-google-setup-honest | integrations | super_admin | happy | `e2e/google-setup.spec.ts` | `1. it renders the personal account, the no-password policy and the honest un-run state` |
| in-google-setup-run-simulated | integrations | super_admin | happy | `e2e/google-setup.spec.ts` | `2. running the setup executes the whole plan and labels it SIMULATED` |
| in-hub-category-grouping | integrations | super_admin | happy | `e2e/integration-hub.spec.ts` | `4. providers are grouped under their canonical category headings` |
| in-hub-filter-by-tile | integrations | super_admin | happy | `e2e/integration-hub.spec.ts` | `2. filtering by a tile shows only matching providers, count for count` |
| in-hub-no-page-errors | integrations | super_admin | happy | `e2e/integration-hub.spec.ts` | `5. no page errors while operating the Hub` |
| in-hub-search-truthful-count | integrations | super_admin | happy | `e2e/integration-hub.spec.ts` | `3. search filters providers and reports the true visible/total count` |
| in-hub-tiles-derived | integrations | super_admin | happy | `e2e/integration-hub.spec.ts` | `1. overview tiles are derived from the rendered provider modes` |
| in-social-admin-control-centre | integrations | super_admin | happy | `e2e/embedded-social.spec.ts` | `9. admin control centre reports the verified engine, mode and findings` |
| in-social-branded-identity | integrations | brand_user | happy | `e2e/embedded-social.spec.ts` | `2. customer-facing identity is Mercenta Social — no engine name, no sign-up` |
| in-social-launch-handoff-or-truth | integrations | brand_user | happy | `e2e/embedded-social.spec.ts` | `10. opening the workspace either hands off to the real engine or reports the truth` |
| in-social-module-surface-drilldown | integrations | brand_user | happy | `e2e/embedded-social.spec.ts` | `3. the FULL module surface is present and each module drills down` |
| in-social-provisioned-automatically | integrations | brand_user | happy | `e2e/embedded-social.spec.ts` | `1. approved brand reaches Mercenta Social and is provisioned automatically` |
| in-social-reload-no-duplicate | integrations | brand_user | persistence | `e2e/embedded-social.spec.ts` | `4. a browser reload cannot duplicate the workspace (identity is derived, not stored)` |
| in-social-relogin-no-duplicate | integrations | brand_user | persistence | `e2e/embedded-social.spec.ts` | `5. logout + re-login does NOT provision a second workspace` |
| in-social-simulation-studio | integrations | brand_user | happy | `e2e/embedded-social.spec.ts` | `11. the simulation studio runs the engine workflow deterministically, with no live call` |
| in-social-simulation-zero-calls | integrations | brand_user | happy | `e2e/embedded-social.spec.ts` | `8. simulation stays simulation — zero external provider/engine calls` |
| in-social-tenant-separate-workspaces | integrations | brand_user | refusal | `e2e/embedded-social.spec.ts` | `6. two brands receive SEPARATE workspaces and cannot see each other` |
| in-social-unapproved-brand-denied | integrations | brand_user | refusal | `e2e/embedded-social.spec.ts` | `7. an unapproved brand cannot reach Mercenta Social` |
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
| op-bi-brand-qualitative-only | operations | brand_user | happy | `e2e/workstream-b-intelligence.spec.ts` | `3. Brand-facing Market Intel shows qualitative positioning only — no raw score, no tier badges` |
| op-bi-internal-notes-audited | operations | super_admin | happy | `e2e/workstream-b-intelligence.spec.ts` | `4. Internal notes editor saves via the canonical store with an audited lifecycle event` |
| op-bi-non-super-denied | operations | mercenta_admin | refusal | `e2e/workstream-b-intelligence.spec.ts` | `2. Non-Super staff are denied the proprietary BI surface (nav hidden, not merely relabelled)` |
| op-bi-super-admin-full-surface | operations | super_admin | happy | `e2e/workstream-b-intelligence.spec.ts` | `1. Super Admin sees the full proprietary BI surface incl. Product Discovery + Regional Priority` |
| op-brain-empty-state-honest | operations | super_admin | happy | `e2e/mercenta-brain.spec.ts` | `3. a no-match filter shows an honest empty state` |
| op-brain-entity-inspector | operations | super_admin | happy | `e2e/mercenta-brain.spec.ts` | `4. selecting an entity shows its detail, provenance, authority and relationships` |
| op-brain-entity-list-keyboard | operations | super_admin | a11y | `e2e/mercenta-brain.spec.ts` | `6. the entity list is the keyboard-accessible equivalent` |
| op-brain-filters-truthful-total | operations | super_admin | happy | `e2e/mercenta-brain.spec.ts` | `2. filters change the rendered set and the total stays truthful` |
| op-brain-kpi-drilldown | operations | super_admin | happy | `e2e/mercenta-brain.spec.ts` | `11. every KPI tile drills down into the set it counts (part 2b interactivity)` |
| op-brain-operating-graph-counts | operations | super_admin | happy | `e2e/mercenta-brain.spec.ts` | `1. renders the real operating graph with domain-derived counts` |
| op-brain-reduced-motion | operations | super_admin | a11y | `e2e/mercenta-brain.spec.ts` | `9. reduced motion is honoured without breaking rendering` |
| op-brain-relationship-reselect | operations | super_admin | happy | `e2e/mercenta-brain.spec.ts` | `5. relationship inspection re-selects the related entity` |
| op-brain-responsive-no-overflow | operations | super_admin | responsive | `e2e/mercenta-brain.spec.ts` | `8. responsive: no horizontal overflow at 1440 / 1280 / 1024 / 390` |
| op-brain-tenant-boundary-brand-map | operations | brand_user | refusal | `e2e/mercenta-brain.spec.ts` | `10. tenant boundary: a brand sees its own map, never the Brain` |
| op-brain-zoom-controls | operations | super_admin | happy | `e2e/mercenta-brain.spec.ts` | `7. zoom controls work and the graph stays usable` |
| op-case-full-lifecycle | operations | mercenta_admin | happy | `e2e/brand-case-workflow.spec.ts` | `2. brand → Mercenta review → escalation (simulated) → response → resolution → brand` |
| op-case-sufficiency-gate | operations | brand_user | refusal | `e2e/brand-case-workflow.spec.ts` | `1. the brand-visible sufficiency gate fails closed, then opens on its own record` |
| op-case-tenant-isolation | operations | brand_user | refusal | `e2e/brand-case-workflow.spec.ts` | `3. tenant isolation — another brand never sees this brand’s case` |
| op-command-handoff-exact-tab | operations | super_admin | happy | `e2e/command-centre.spec.ts` | `2. a founder hand-off routes to the exact Super Admin tab (no hunting)` |
| op-command-rank-why-funding-route | operations | super_admin | happy | `e2e/command-centre.spec.ts` | `4. every founder row shows its rank and WHY, and the funding slot routes` |
| op-command-source-filters-single-list | operations | super_admin | happy | `e2e/command-centre.spec.ts` | `3. the founder categories are real source filters, and the Control Centre has no second list` |
| op-command-work-management-founder-console | operations | super_admin | happy | `e2e/command-centre.spec.ts` | `1. Work Management carries the founder console, one hand-off per row` |
| op-notify-ack-simulated-provenance | operations | mercenta_admin | happy | `e2e/notifications.spec.ts` | `3. Mercenta transmits the acknowledgement to the retail channel (simulated)` |
| op-notify-brand-accept-consignment | operations | brand_user | happy | `e2e/notifications.spec.ts` | `2. Brand accepts all lines -> Mercenta acts and the consignment appears in logistics` |
| op-notify-channel-read-entry | operations | mercenta_admin | happy | `e2e/notifications.spec.ts` | `1. Admin channel-read entry exists (the ONLY way a PO arrives)` |
| op-notify-labels-modal | operations | mercenta_admin | happy | `e2e/notifications.spec.ts` | `4. Labels modal opens for the consignment Mercenta filed` |
| op-tour-catalog-triggers-tour2 | operations | brand_user | happy | `e2e/tours.spec.ts` | `9. Catalog page triggers Tour 2` |
| op-tour-completed-no-retrigger | operations | brand_user | happy | `e2e/tours.spec.ts` | `2. Completed Tour 1 does not re-trigger` |
| op-tour-deductions-ledger-scoped | operations | brand_user | happy | `e2e/tours.spec.ts` | `5. Deductions ledger on Analytics (Tour 5 surface)` |
| op-tour-kb-article-panel | operations | brand_user | happy | `e2e/tours.spec.ts` | `10. Tour step opens the contextual Knowledge Base article (§14)` |
| op-tour-orientation-autostart | operations | brand_user | happy | `e2e/tours.spec.ts` | `1. Tour 1 auto-starts for new brand` |
| op-tour-po-triggers-tour3 | operations | brand_user | happy | `e2e/tours.spec.ts` | `4. PO page triggers Tour 3` |
| op-tour-selectors-resolve | operations | brand_user | happy | `e2e/tours.spec.ts` | `8. Tour selectors resolve` |
| op-tour-settings-restart | operations | brand_user | happy | `e2e/tours.spec.ts` | `7. Settings has restart tour` |
| op-tour-skip-confirmation | operations | brand_user | happy | `e2e/tours.spec.ts` | `3. Skip Tour 1 shows confirmation` |
| op-tour-steps-advance | operations | brand_user | happy | `e2e/tours.spec.ts` | `6. Tour steps advance correctly` |
| op-work-badge-labelled-attention | operations | mercenta_admin | happy | `e2e/work-layer.spec.ts` | `1b. §SSOT S5 — the work badge is LABELLED and counts the attention set, not the open set` |
| op-work-brand-create-task-views | operations | brand_user | happy | `e2e/work-layer.spec.ts` | `9. a brand can create a task and it appears across the views` |
| op-work-brand-own-work-only | operations | brand_user | refusal | `e2e/work-layer.spec.ts` | `8. a brand sees its OWN work only` |
| op-work-calendar-month-grid | operations | mercenta_admin | happy | `e2e/work-layer.spec.ts` | `6. calendar is a real derived month grid` |
| op-work-filters-search-real | operations | mercenta_admin | happy | `e2e/work-layer.spec.ts` | `2. priority filter and search are real state changes` |
| op-work-kanban-board | operations | mercenta_admin | happy | `e2e/work-layer.spec.ts` | `4. kanban is a real board over the same items` |
| op-work-manual-task-resolves | operations | mercenta_admin | happy | `e2e/work-layer.spec.ts` | `5b. a MANUAL task still resolves and leaves the list (the work layer owns it)` |
| op-work-no-overflow-390 | operations | mercenta_admin | responsive | `e2e/work-layer.spec.ts` | `7. no horizontal overflow at 390px` |
| op-work-owning-action-not-resolve | operations | mercenta_admin | happy | `e2e/work-layer.spec.ts` | `5. a record-qualified row offers the OWNING action, and a mark never hides it` |
| op-work-rbac-no-founder-console | operations | mercenta_admin | refusal | `e2e/work-layer.spec.ts` | `0a. a NON-Super-Admin admin session never sees the founder console` |
| op-work-record-drawer-activity | operations | mercenta_admin | happy | `e2e/work-layer.spec.ts` | `3. a row opens the shared record drawer with its activity trail` |
| op-work-reset-baseline | operations | brand_user | persistence | `e2e/work-layer.spec.ts` | `10. reset restores the deterministic baseline` |
| op-work-super-admin-founder-console | operations | super_admin | happy | `e2e/work-layer.spec.ts` | `0b. a Super Admin session DOES see the founder console in the same list` |
| op-work-workspace-architecture | operations | mercenta_admin | happy | `e2e/work-layer.spec.ts` | `1. composes the workspace architecture and renders real work` |
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
| sl-appointment-eta-coverage-detail | commerce_logistics | brand_user | happy | `e2e/delivery-appointment.spec.ts` | `2. the ETA-coverage tile opens the detail, and every consignment names a documented state` |
| sl-appointment-inspector-window-verdict | commerce_logistics | brand_user | happy | `e2e/delivery-appointment.spec.ts` | `1. the consignment inspector shows the appointment and the window verdict` |
| sl-appointment-window-rule-stated | commerce_logistics | brand_user | refusal | `e2e/delivery-appointment.spec.ts` | `3. the window rule is always stated — inside the window, or a refusal with a reason` |
| sl-carrier-console-dhl-milestone | commerce_logistics | mercenta_admin | happy | `e2e/compliance-sim.spec.ts` | `DHL status button advances the shipment milestone (simulated)` |
| sl-delta-escalation-fails-closed | commerce_logistics | mercenta_admin | refusal | `e2e/supply-route-escalation.spec.ts` | `5. the decision FAILS CLOSED — human review, no 3PL recommended` |
| sl-delta-no-false-live-claim | commerce_logistics | mercenta_admin | refusal | `e2e/supply-route-escalation.spec.ts` | `7. the panel makes no false live claim` |
| sl-delta-no-horizontal-overflow | commerce_logistics | mercenta_admin | responsive | `e2e/supply-route-escalation.spec.ts` | `8. no horizontal overflow at desktop and mobile widths` |
| sl-delta-panel-renders | commerce_logistics | mercenta_admin | happy | `e2e/supply-route-escalation.spec.ts` | `1. the section renders on the admin Logistics Hub` |
| sl-delta-partner-mode-truthful | commerce_logistics | mercenta_admin | refusal | `e2e/supply-route-escalation.spec.ts` | `3. the partner mode is stated truthfully (Simulation, never Live)` |
| sl-delta-partner-named-not-carrier | commerce_logistics | mercenta_admin | happy | `e2e/supply-route-escalation.spec.ts` | `2. the declared 3PL partner is named and stated as a 3PL (fulfils, does not carry)` |
| sl-delta-thresholds-not-agreed | commerce_logistics | mercenta_admin | boundary | `e2e/supply-route-escalation.spec.ts` | `4. the escalation thresholds are shown as not agreed` |
| sl-delta-unknown-fields-named | commerce_logistics | mercenta_admin | happy | `e2e/supply-route-escalation.spec.ts` | `6. the unrecorded fields are NAMED as unknown, with the derivation stated` |
| sl-fulfilment-borderline-review | commerce_logistics | mercenta_admin | boundary | `e2e/fulfillment-tracks.spec.ts` | `4. Score borderline -> admin review flag` |
| sl-fulfilment-direct-model | commerce_logistics | mercenta_admin | happy | `e2e/fulfillment-tracks.spec.ts` | `1. Direct model is documented` |
| sl-fulfilment-financed-model | commerce_logistics | mercenta_admin | happy | `e2e/fulfillment-tracks.spec.ts` | `2. Financed model is documented` |
| sl-fulfilment-scoreboard | commerce_logistics | mercenta_admin | happy | `e2e/fulfillment-tracks.spec.ts` | `3. Scoreboard renders per-brand scores` |
| sl-hero-and-map-one-page | commerce_logistics | brand_user | happy | `e2e/logistics-hero.spec.ts` | `1. the hero and the operational map are ONE page` |
| sl-hero-authentic-geography | commerce_logistics | brand_user | happy | `e2e/logistics-hero.spec.ts` | `6. authentic, generated, attributed geography (no hand-drawn shapes)` |
| sl-hero-canonical-consignments | commerce_logistics | brand_user | happy | `e2e/logistics-hero.spec.ts` | `9. the hero plots the same brand consignments as the operational map` |
| sl-hero-controls-interactive | commerce_logistics | brand_user | happy | `e2e/logistics-hero.spec.ts` | `13. the operational controls remain interactive below the hero` |
| sl-hero-fixed-camera-scrolls | commerce_logistics | brand_user | a11y | `e2e/logistics-hero.spec.ts` | `2/3. fixed camera, no pointer capture, the page still scrolls` |
| sl-hero-fleet-and-origins | commerce_logistics | brand_user | happy | `e2e/logistics-hero.spec.ts` | `4/5. many aircraft, many ships, many road vehicles, many origins` |
| sl-hero-no-external-call | commerce_logistics | brand_user | happy | `e2e/logistics-hero.spec.ts` | `12. the hero makes no external network call` |
| sl-hero-no-horizontal-overflow | commerce_logistics | brand_user | responsive | `e2e/logistics-hero.spec.ts` | `14. no horizontal overflow at desktop and mobile widths` |
| sl-hero-reduced-motion | commerce_logistics | brand_user | a11y | `e2e/logistics-hero.spec.ts` | `10. reduced motion keeps a meaningful static view` |
| sl-hero-truth-labels-ambient | commerce_logistics | brand_user | happy | `e2e/logistics-hero.spec.ts` | `7/8/11. truth semantics are labelled and ambient is never a shipment` |
| sl-hub-admin-map-evidence-filter | commerce_logistics | mercenta_admin | happy | `e2e/logistics-hub-map.spec.ts` | `C. the evidence filter genuinely changes the drawn set` |
| sl-hub-admin-map-real-consignment | commerce_logistics | mercenta_admin | persistence | `e2e/logistics-hub-map.spec.ts` | `B. a consignment created through the real PO lifecycle appears on the admin map` |
| sl-hub-admin-map-truth-labelling | commerce_logistics | mercenta_admin | happy | `e2e/logistics-hub-map.spec.ts` | `A. the admin map renders with the canonical truth labelling` |
| sl-hub-map-arrival-node-is-po-fc | commerce_logistics | brand_user | happy | `e2e/logistics-hub-map.spec.ts` | `17. §P5 — the arrival node is the destination FC on the PO, never a hub` |
| sl-hub-map-artefacts-and-empty-state | commerce_logistics | brand_user | happy | `e2e/logistics-hub-map.spec.ts` | `14/15. artefacts still open and close` |
| sl-hub-map-evidence-filter | commerce_logistics | brand_user | happy | `e2e/logistics-hub-map.spec.ts` | `5. the evidence filter changes the drawn set and the list` |
| sl-hub-map-freight-responsibility | commerce_logistics | brand_user | happy | `e2e/logistics-hub-map.spec.ts` | `8/9/10. freight responsibility is stated truthfully` |
| sl-hub-map-inspector-evidence | commerce_logistics | brand_user | happy | `e2e/logistics-hub-map.spec.ts` | `4. selecting a consignment opens the inspector with its evidence` |
| sl-hub-map-interactive | commerce_logistics | brand_user | happy | `e2e/logistics-hub-map.spec.ts` | `1. renders the workspace and a real interactive map` |
| sl-hub-map-leg-per-consignment | commerce_logistics | brand_user | happy | `e2e/logistics-hub-map.spec.ts` | `2. draws one leg per visible consignment from declared coordinates` |
| sl-hub-map-nothing-falsely-live | commerce_logistics | brand_user | refusal | `e2e/logistics-hub-map.spec.ts` | `6/7. evidence is labelled and nothing is falsely live` |
| sl-hub-map-reduced-motion | commerce_logistics | brand_user | a11y | `e2e/logistics-hub-map.spec.ts` | `11. reduced motion disables the ambient drift` |
| sl-hub-map-responsive | commerce_logistics | brand_user | responsive | `e2e/logistics-hub-map.spec.ts` | `12. no horizontal overflow at any required viewport` |
| sl-hub-map-search | commerce_logistics | brand_user | happy | `e2e/logistics-hub-map.spec.ts` | `16. search narrows the map and the list together` |
| sl-hub-map-tenant-isolation | commerce_logistics | brand_user | refusal | `e2e/logistics-hub-map.spec.ts` | `13. tenant isolation — one brand never sees another brand’s consignments` |
| sl-hub-map-zoom | commerce_logistics | brand_user | happy | `e2e/logistics-hub-map.spec.ts` | `3. zoom actually changes the rendered view` |
| sl-providers-admin-staff-no-dead-end | commerce_logistics | mercenta_admin | refusal | `e2e/logistics-providers.spec.ts` | `4b. an admin-STAFF session gets the configuration but NO dead-end hand-off` |
| sl-providers-brand-no-credential-form | commerce_logistics | brand_user | refusal | `e2e/logistics-providers.spec.ts` | `2. the brand surface exposes no credential form and no cost base` |
| sl-providers-carrier-accounts | commerce_logistics | brand_user | happy | `e2e/logistics-providers.spec.ts` | `1. both Mercenta carrier accounts are stated with their lane and real state` |
| sl-providers-consolidation-deferred | commerce_logistics | brand_user | happy | `e2e/logistics-providers.spec.ts` | `3. consolidation is shown as DEFERRED with its documented evidence and invariants` |
| sl-providers-operator-cross-tenant-queue | commerce_logistics | mercenta_admin | happy | `e2e/logistics-providers.spec.ts` | `5. the operator sees the cross-tenant PO-document queue and the same posture` |
| sl-providers-super-admin-handoff | commerce_logistics | super_admin | happy | `e2e/logistics-providers.spec.ts` | `4. the SUPER ADMIN sees the provider configuration and reaches Integration Settings` |
| sl-returns-admin-destination-under-operations | commerce_logistics | mercenta_admin | happy | `e2e/app-shell.spec.ts` | `Admin — grouping is structural (Operations is the action centre)` |
| sl-returns-admin-queue-drawer-advance | commerce_logistics | mercenta_admin | happy | `e2e/record-drawer.spec.ts` | `5. returns row click opens the preview drawer and Advance is real` |
| sl-returns-admin-queue-responsive | commerce_logistics | mercenta_admin | responsive | `e2e/record-drawer.spec.ts` | `9. admin record queues at ${vp.w}x${vp.h} — no horizontal overflow` |
| sl-returns-brand-destination | commerce_logistics | brand_user | happy | `e2e/app-shell.spec.ts` | `Brand — grouped IA renders with brand sections` |
| sl-shipment-freight-collect-routing-mercenta | commerce_logistics | mercenta_admin | happy | `e2e/shipment-asn.spec.ts` | `3. Amazon freight (collect) -> routing step raised by MERCENTA, and NO unsupported channel deadline` |
| sl-shipment-freight-prepaid-window | commerce_logistics | brand_user | happy | `e2e/shipment-asn.spec.ts` | `4. Vendor freight (prepaid) -> fixed delivery window respected` |
| sl-shipment-milestone-delivered-live | commerce_logistics | mercenta_admin | happy | `e2e/shipment-asn.spec.ts` | `5. Shipment marked delivered -> status updates to live on retail` |
| sl-shipment-onbehalf-asn-non-regulated | commerce_logistics | mercenta_admin | happy | `e2e/shipment-asn.spec.ts` | `7. Admin on-behalf ASN for a non-regulated brand -> submits without lot/expiry` |
| sl-shipment-onbehalf-asn-regulated-lot-expiry | commerce_logistics | mercenta_admin | happy | `e2e/shipment-asn.spec.ts` | `6. Admin on-behalf ASN for a regulated Grocery brand -> lot + expiry required and submitted` |
| sl-shipment-packing-correction-files-asn | commerce_logistics | brand_user | happy | `e2e/shipment-asn.spec.ts` | `1. Packing correction reaches Mercenta, which files the ASN` |
| sl-shipment-progression-simulation | commerce_logistics | super_admin | happy | `e2e/simulation-control.spec.ts` | `Run SHIPMENT_PROGRESSION succeeds with milestone steps + waybill` |
| sl-shipment-shortfall-deduction | commerce_logistics | brand_user | exception | `e2e/shipment-asn.spec.ts` | `2. Packed qty below acknowledged qty -> shortfall logged as deduction` |
| sl-wave3-accept-takes-to-hub | commerce_logistics | brand_user | happy | `e2e/logistics-wave3.spec.ts` | `7. after accepting a PO the brand is taken to that PO in the Logistics Hub` |
| sl-wave3-backorder-allowed | commerce_logistics | brand_user | happy | `e2e/logistics-wave3.spec.ts` | `1. a line the channel allows still offers Backordered, and the ack succeeds` |
| sl-wave3-backorder-refused | commerce_logistics | brand_user | refusal | `e2e/logistics-wave3.spec.ts` | `2. a line the channel does NOT allow offers no Backordered option and explains why` |
| sl-wave3-carrier-eligibility | commerce_logistics | brand_user | happy | `e2e/logistics-wave3.spec.ts` | `4. carrier eligibility is derived and names the provider state` |
| sl-wave3-delivery-performance-drilldown | commerce_logistics | brand_user | happy | `e2e/logistics-wave3.spec.ts` | `5. delivery performance opens a real drill-down and never invents a rate` |
| sl-wave3-eta-with-basis | commerce_logistics | brand_user | happy | `e2e/logistics-wave3.spec.ts` | `3. the Hub shows an ETA with an explicit basis, never a bare date` |
| sl-wave3-no-unsupported-deadline | commerce_logistics | brand_user | refusal | `e2e/logistics-wave3.spec.ts` | `6. no unsupported "10am Pacific" channel deadline is presented` |
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
| spec-state-coverage | platform | mixed | happy | `e2e/state-coverage.spec.ts` | — |
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
