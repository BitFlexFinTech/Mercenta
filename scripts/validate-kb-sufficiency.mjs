// §Brief §6 — KB SUFFICIENCY + TENANT-SAFE RELEVANT-DATA LOOKUP (increment S2a).
//
// Validates the canonical case "checks" step as BEHAVIOUR, not as a code shape:
//   A. CONTRACT     — every CaseCategory is mapped; every mapped article id
//                     really exists in the Knowledge Base store.
//   B. RESOLVED     — a case anchored to the brand's OWN record is sufficiently
//                     supported and resolves internally.
//   C. MISSING      — a case whose category requires an anchor, with no anchor,
//                     is NOT internally resolvable.
//   D. NOT FOUND    — a reference that does not exist is NOT internally
//                     resolvable.
//   E. CROSS-TENANT — a reference belonging to ANOTHER brand is refused, is
//                     reported as cross-tenant, and leaks no other-tenant data.
//   F. CHANNEL      — an `amazon_related` case is never internally resolvable.
//   G. NO CATEGORY  — an untyped case is NOT internally resolvable.
//   H. DECIDED      — a case already past review is `not_applicable`.
//   I. DETERMINISM  — identical input ⇒ byte-identical verdict; no clock/random.
//   J. PURITY       — evaluating a case mutates nothing.
//   K. TENANT SCOPE — `listCasesForBrand` never returns another tenant's case.
//   L. ZERO NETWORK — asserted for the whole run.
//
// Run: node scripts/validate-kb-sufficiency.mjs
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
let assertions = 0;
const test = (name, ok, detail = '') => {
  assertions += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

/* ── ZERO NETWORK for the whole run ──────────────────────────────────────── */
let networkCalls = 0;
globalThis.fetch = async (...args) => {
  networkCalls++;
  throw new Error(`NO LIVE NETWORK ALLOWED IN VALIDATION: ${String(args[0])}`);
};

try {
  const kb = await server.ssrLoadModule('/src/lib/helpdesk/kbSufficiency.ts');
  const tickets = await server.ssrLoadModule('/src/lib/helpdesk/ticketStore.ts');
  const knowledgeBase = await server.ssrLoadModule('/src/data/knowledgeBase.ts');
  const demoStore = await server.ssrLoadModule('/src/data/demoStore.ts');

  const { evaluateCaseSufficiency, CASE_CATEGORY_KB_ARTICLES } = kb;
  const { createCase, listCasesForBrand, resetCaseSequence } = tickets;
  const { getKnowledgeArticle, KB_ARTICLES } = knowledgeBase;
  const { demoPurchaseOrders } = demoStore;

  const CATEGORIES = [
    'po_question', 'shipment_issue', 'delivery_issue', 'deduction', 'payment_issue',
    'compliance_question', 'catalogue_issue', 'amazon_related', 'general',
  ];

  const caseOf = (over) => ({
    id: 'case-test', brandId: 'brand-x', messageIds: [], lastMessagePreview: 'x',
    lastMessageAt: '2026-09-20T00:00:00.000Z', status: 'open', priority: 'medium',
    source: 'in_app', subject: 'Subject', createdAt: '2026-09-20T00:00:00.000Z',
    seenByStaff: false, escalationState: 'brand_submitted', ...over,
  });

  /* ── A. CONTRACT ─────────────────────────────────────────────────────── */
  test('every CaseCategory has a Knowledge Base mapping',
    CATEGORIES.every((c) => Array.isArray(CASE_CATEGORY_KB_ARTICLES[c])));
  const mappedIds = [...new Set(CATEGORIES.flatMap((c) => CASE_CATEGORY_KB_ARTICLES[c]))];
  test('every mapped article id exists in the Knowledge Base store',
    mappedIds.every((id) => !!getKnowledgeArticle(id)),
    `${mappedIds.length} distinct ids, ${KB_ARTICLES.length} articles`);
  test('channel matters (`amazon_related`) carry NO internal guidance',
    CASE_CATEGORY_KB_ARTICLES.amazon_related.length === 0);

  /* ── Data derived from the canonical stores (never hardcoded) ─────────── */
  const brandA = demoPurchaseOrders[0]?.brandId;
  const ownPoA = demoPurchaseOrders.find((p) => p.brandId === brandA);
  const otherPo = demoPurchaseOrders.find((p) => p.brandId !== brandA);
  test('the canonical store provides two distinct tenants for the negative test',
    !!brandA && !!otherPo && otherPo.brandId !== brandA,
    `A=${brandA} B=${otherPo?.brandId}`);

  /* ── B. RESOLVED ─────────────────────────────────────────────────────── */
  const okA = evaluateCaseSufficiency(caseOf({
    brandId: brandA, caseCategory: 'po_question', relatedPoNumber: ownPoA.poNumber,
  }));
  test('own-anchored case is internally resolvable', okA.verdict === 'internally_resolvable', okA.verdict);
  test('own-anchored case resolves its knowledge article', okA.articleIds.includes('kb-purchase-orders'));
  test('own-anchored case resolves the referenced record in its own tenant',
    okA.context.length === 1 && okA.context[0].resolved === true && okA.context[0].brandId === brandA);
  test('an internally-resolvable verdict always carries its reasons', okA.reasons.length > 0);

  /* ── C. MISSING ANCHOR ───────────────────────────────────────────────── */
  const noAnchor = evaluateCaseSufficiency(caseOf({ brandId: brandA, caseCategory: 'po_question' }));
  test('a required-but-absent anchor fails closed', noAnchor.verdict === 'requires_founder_review');
  test('the absent anchor is explained',
    noAnchor.reasons.some((r) => /must name the purchase order/i.test(r)));

  /* ── D. NOT FOUND ────────────────────────────────────────────────────── */
  const notFound = evaluateCaseSufficiency(caseOf({
    brandId: brandA, caseCategory: 'po_question', relatedPoNumber: 'PO-DOES-NOT-EXIST',
  }));
  test('an unresolvable reference fails closed', notFound.verdict === 'requires_founder_review');
  test('an unresolvable reference is reported as unresolved, not cross-tenant',
    notFound.context.length === 1 && notFound.context[0].resolved === false &&
    notFound.context[0].crossTenant === false);

  /* ── E. CROSS-TENANT ─────────────────────────────────────────────────── */
  const cross = evaluateCaseSufficiency(caseOf({
    brandId: brandA, caseCategory: 'po_question', relatedPoNumber: otherPo.poNumber,
  }));
  test('a reference from ANOTHER tenant fails closed', cross.verdict === 'requires_founder_review');
  test('the cross-tenant reference is refused, not resolved',
    cross.context.length === 1 && cross.context[0].resolved === false &&
    cross.context[0].crossTenant === true);
  test('a cross-tenant refusal leaks no other-tenant identifier',
    cross.context.every((c) => (c.resolved ? c.brandId === brandA : c.brandId === undefined)));
  test('the cross-tenant refusal says so in words an operator can act on',
    cross.reasons.some((r) => /different tenant/i.test(r)));

  /* ── F. CHANNEL ──────────────────────────────────────────────────────── */
  const channel = evaluateCaseSufficiency(caseOf({ brandId: brandA, caseCategory: 'amazon_related' }));
  test('a retail-channel case is never internally resolvable',
    channel.verdict === 'requires_founder_review' && channel.articleIds.length === 0);

  /* ── G. NO CATEGORY / H. DECIDED ─────────────────────────────────────── */
  test('an untyped case fails closed',
    evaluateCaseSufficiency(caseOf({ brandId: brandA })).verdict === 'requires_founder_review');
  for (const state of ['approved_for_escalation', 'escalated_to_provider', 'provider_responded', 'resolved', 'closed']) {
    test(`a case already past review is not_applicable (${state})`,
      evaluateCaseSufficiency(caseOf({ brandId: brandA, caseCategory: 'po_question', escalationState: state }))
        .verdict === 'not_applicable');
  }

  /* ── G2. ANCHORED CATEGORIES OTHER THAN PO ───────────────────────────── */
  const complianceDoc = demoStore.demoComplianceDocs.find((d) => d.brandId === brandA);
  test('the canonical store provides a compliance document for the anchor test', !!complianceDoc);
  if (complianceDoc) {
    const c = evaluateCaseSufficiency(caseOf({
      brandId: brandA, caseCategory: 'compliance_question', relatedComplianceDocId: complianceDoc.id,
    }));
    test('a compliance case anchored to the brand own document resolves internally',
      c.verdict === 'internally_resolvable' && c.context[0].resolved === true);
  }
  const general = evaluateCaseSufficiency(caseOf({ brandId: brandA, caseCategory: 'general' }));
  test('a general enquiry with no anchor is supported by guidance alone',
    general.verdict === 'internally_resolvable' && general.articleIds.length > 0);

  /* ── I. DETERMINISM ──────────────────────────────────────────────────── */
  const input = caseOf({ brandId: brandA, caseCategory: 'po_question', relatedPoNumber: ownPoA.poNumber });
  const first = JSON.stringify(evaluateCaseSufficiency(input));
  for (let i = 0; i < 5; i++) {
    test(`evaluation is deterministic (run ${i + 2})`,
      JSON.stringify(evaluateCaseSufficiency(input)) === first);
  }

  /* ── J. PURITY ───────────────────────────────────────────────────────── */
  const poCount = demoPurchaseOrders.length;
  const kbCount = KB_ARTICLES.length;
  evaluateCaseSufficiency(input);
  test('evaluating a case mutates no store',
    demoPurchaseOrders.length === poCount && KB_ARTICLES.length === kbCount);

  /* ── K. TENANT SCOPE of the case read model ──────────────────────────── */
  resetCaseSequence(0);
  const createdA = createCase({
    id: 'val-case-a', caseRef: 'MC-VAL-A', brandId: brandA,
    subject: 'Validation case A', description: 'Validation', caseCategory: 'po_question',
    relatedPoNumber: ownPoA.poNumber,
  });
  const createdB = createCase({
    id: 'val-case-b', caseRef: 'MC-VAL-B', brandId: otherPo.brandId,
    subject: 'Validation case B', description: 'Validation', caseCategory: 'general',
  });
  const seenByA = listCasesForBrand(brandA);
  const seenByB = listCasesForBrand(otherPo.brandId);
  test('the brand read model returns the brand own case', seenByA.some((c) => c.id === createdA.id));
  test('the brand read model does NOT return another tenant case',
    !seenByA.some((c) => c.id === createdB.id));
  test('the other tenant likewise sees only its own case',
    seenByB.some((c) => c.id === createdB.id) && !seenByB.some((c) => c.id === createdA.id));
  test('every case returned for a tenant belongs to that tenant',
    seenByA.every((c) => c.brandId === brandA) && seenByB.every((c) => c.brandId === otherPo.brandId));

  /* ── L. ZERO NETWORK ─────────────────────────────────────────────────── */
  test('the whole run made zero network calls', networkCalls === 0, `observed ${networkCalls}`);
} catch (err) {
  failures++;
  console.error(`✗ VALIDATION THREW — ${err?.stack ?? err}`);
} finally {
  await server.close();
}

console.log(`\nKB_SUFFICIENCY: ${assertions - failures}/${assertions} assertions passed, ${failures} failure(s)`);
if (failures > 0) process.exit(1);
console.log('KB_SUFFICIENCY_OK');