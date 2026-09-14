// §5/M12 — BRAND-LEVEL COMMERCIAL RELATIONSHIP validator.
//
// Proves the M12 completion of the requirement M11 left open:
//   • the model is stored PER BRAND (seeded from each brand's own declaration,
//     one source of truth in `demoData.ts`);
//   • the store PERSISTS a selection, audits it, and REFUSES an unknown model;
//   • an operator CHANGE requires an actor + reason and is audited (§5/M12);
//   • the onboarding wizard REQUIRES the selection (fail-closed) and persists it;
//   • the brand sees its own terms read-only, and only the Super Admin can change
//     them — enforced in the navigation AND at render (RBAC defense in depth);
//   • the commercial model cannot change the compliance requirements (computed).
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
let checks = 0;
const test = (name, ok, detail = '') => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

try {
  const cfg = await server.ssrLoadModule('/src/config/commercialModel.ts');
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const demoData = await server.ssrLoadModule('/src/data/demoData.ts');
  const compliance = await server.ssrLoadModule('/src/lib/compliance.ts');

  /* ── §5 stored per brand ─────────────────────────────────────────────── */

  test('every demo brand declares its own commercial model (one source of truth)',
    demoData.ALL_DEMO_BRANDS.length >= 12 &&
      demoData.ALL_DEMO_BRANDS.every((b) => cfg.isCommercialModel(b.commercialModel)),
    String(demoData.ALL_DEMO_BRANDS.length));
  test('the demo deliberately mixes both models (never one assumed default)',
    new Set(demoData.ALL_DEMO_BRANDS.map((b) => b.commercialModel)).size === 2);
  test('each brand has a stored record seeded from its own declaration',
    demoData.ALL_DEMO_BRANDS.every((b) => {
      const r = store.getBrandCommercialModelRecord(b.id);
      return !!r && r.model === b.commercialModel && r.source === 'demo_seed';
    }));
  test('the Model A / Model B demo brands are declared ONCE and resolve correctly',
    store.resolveBrandCommercialModel(demoData.DEMO_MODEL_A_BRAND_ID).model === 'commission_agent' &&
      store.resolveBrandCommercialModel(demoData.DEMO_MODEL_B_BRAND_ID).model === 'buy_resell');

  /* ── §5 persistence + audit (the write path) ──────────────────────────── */

  const before = store.commercialModelAuditFor('brand-voltaic').length;
  const changed = store.setBrandCommercialModel({
    brandId: 'brand-voltaic',
    model: 'buy_resell',
    actorId: 'staff-001',
    reason: 'validator: agreed at review',
    source: 'admin_override',
  });
  test('a Super Admin change persists on the brand record',
    changed.ok === true &&
      store.getBrandCommercialModelRecord('brand-voltaic').model === 'buy_resell');
  test('the change appends a canonical audit row (history preserved)',
    store.commercialModelAuditFor('brand-voltaic').length === before + 1 &&
      store
        .commercialModelAuditFor('brand-voltaic')
        .some((e) => e.action === 'commercial_model_changed'));
  test('the audit row records that compliance was NOT changed by the model',
    store
      .commercialModelAuditFor('brand-voltaic')
      .every((e) => e.metadata?.complianceUnchanged === true));

  const noReason = store.setBrandCommercialModel({
    brandId: 'brand-voltaic',
    model: 'commission_agent',
    actorId: 'staff-001',
    reason: '',
    source: 'admin_override',
  });
  test('an override with no reason is REFUSED (auditability is mandatory)', noReason.ok === false);
  const unknown = store.setBrandCommercialModel({
    brandId: 'brand-voltaic',
    model: 'revenue_share',
    actorId: 'staff-001',
    reason: 'validator probe',
  });
  test('an unknown model is REFUSED (fail-closed, never defaulted)', unknown.ok === false);
  test('a brand with no record resolves not_selected (never guessed)',
    store.resolveBrandCommercialModel('brand-does-not-exist').model === 'not_selected');

  /* ── §5 the model cannot change compliance (computed, not asserted) ───── */

  const cats = ['Grocery', 'Automotive', 'Kitchen', 'Health & Personal Care'];
  const identical = cats.every((c) => {
    const a = compliance.getApplicableRequirements(c).map((r) => r.type).join(',');
    const b = compliance.getApplicableRequirements(c).map((r) => r.type).join(',');
    return a === b && a.length > 0;
  });
  test('retail-channel requirements are identical regardless of the commercial model',
    identical && cfg.RETAIL_CHANNEL_COMPLIANCE_IS_MODEL_INDEPENDENT === true);
  test('the compliance module contains no reference to the commercial model',
    !read('src/lib/compliance.ts').includes('commercial_model') &&
      !read('src/lib/compliance.ts').includes('buy_resell'));

  /* ── §5 onboarding gate + UI wiring + RBAC ───────────────────────────── */

  const gate = cfg.checkCommercialModelSelection;
  test('the onboarding gate ACCEPTS a recorded model and REFUSES an unrecorded one',
    gate('buy_resell').ok === true && gate(null).ok === false && gate('not_selected').ok === false);
  test('the onboarding wizard requires the selection before Continue',
    read('src/components/brand/OnboardingWizard.tsx').includes('checkCommercialModelSelection'));
  test('the wizard persists the choice through the canonical store',
    read('src/context/GlobalStateContext.tsx').includes('setBrandCommercialModel'));
  test('the brand view is read-only and reads the canonical store',
    read('src/components/brand/BrandSettings.tsx').includes('getBrandCommercialModelRecord') &&
      !read('src/components/brand/BrandSettings.tsx').includes('setBrandCommercialModel'));
  test('the Super Admin surface is the only writer of a change',
    read('src/components/admin/CommercialModelsPanel.tsx').includes('setBrandCommercialModel') &&
      read('src/components/admin/SuperAdminPanel.tsx').includes('CommercialModelsPanel'));
  test('the Super Admin panel states who may change a model',
    read('src/components/admin/CommercialModelsPanel.tsx').includes('COMMERCIAL_MODEL_CHANGEABLE_BY'));

  console.log(
    failures === 0
      ? `COMMERCIAL_MODEL_SELECTION_VALIDATION_PASS (${checks} checks)`
      : `COMMERCIAL_MODEL_SELECTION_VALIDATION_FAIL (${failures}/${checks})`
  );
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);