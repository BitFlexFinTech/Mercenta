// §21/§41.13–17/M12 — FOUNDER INVESTOR CENTRE + PARTNERSHIPS/FUNDRAISING validator.
//
// Proves the founder's private operating centre is REAL and HONEST:
//   • the pitch/model/talking-point/question/practice content is complete and
//     quotes figures DERIVED from the canonical commercial-model arithmetic;
//   • no material claims an existing partnership, endorsement or Amazon approval;
//   • the brief + deck generators produce usable artefacts from that content, and
//     state plainly that they are HTML (a .pptx export is NOT claimed);
//   • the partner registry is entirely prospective and the fundraising plan claims
//     no commitments;
//   • recipient-specific outreach generation is deterministic, refused when the
//     wording gate fails, requires an EXPLICIT confirmation to send, and sends
//     through the canonical mail seam with ZERO network calls in simulation;
//   • both private surfaces are Super Admin only (hidden AND render-guarded).
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

let networkCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...args) => {
  networkCalls += 1;
  console.error('[validate-founder-centre] UNEXPECTED network call:', args[0]);
  return realFetch(...args);
};

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
  const content = await server.ssrLoadModule('/src/config/founderContent.ts');
  const partners = await server.ssrLoadModule('/src/config/partnerships.ts');
  const docs = await server.ssrLoadModule('/src/lib/founder/documentExport.ts');
  const outreach = await server.ssrLoadModule('/src/lib/founder/partnerOutreach.ts');
  const fin = await server.ssrLoadModule('/src/lib/finance/commercialModel.ts');

  /* ── §21 content completeness and derived figures ───────────────────── */

  const ids = content.FOUNDER_PITCHES.map((p) => p.id);
  test('all five pitch lengths exist, in order',
    ids.join(',') === 'one_line,thirty_seconds,sixty_seconds,two_minutes,five_minutes',
    ids.join(','));
  test('every pitch has a spoken body and a target duration',
    content.FOUNDER_PITCHES.every((p) => p.body.length > 80 && p.duration.length > 3));
  test('the business model, talking points, questions and practice are complete',
    content.FOUNDER_BUSINESS_MODEL.length === 8 &&
      content.FOUNDER_TALKING_POINTS.length === 16 &&
      content.FOUNDER_DIFFICULT_QUESTIONS.length >= 21 &&
      content.FOUNDER_MEETING_PRACTICE.length === 6,
    `${content.FOUNDER_BUSINESS_MODEL.length}/${content.FOUNDER_TALKING_POINTS.length}/${content.FOUNDER_DIFFICULT_QUESTIONS.length}/${content.FOUNDER_MEETING_PRACTICE.length}`);

  const f = content.FOUNDER_KEY_FIGURES;
  test('the quoted Model A figures are DERIVED from the canonical arithmetic',
    f.modelA.commission === '£2,000' && f.modelA.brandAmount === '£8,000' &&
      fin.DEMO_MODEL_A_BRAND_A.mercentaCommissionGbp === 2000);
  test('the quoted Model B figures are DERIVED (gross spread ≠ net margin)',
    f.modelB.grossSpread === '£2,500' && f.modelB.netMargin === '£2,270' &&
      f.modelB.costs === '£230' && f.modelB.grossSpread !== f.modelB.netMargin);
  test('the quoted shipping figures are DERIVED from the canonical terms',
    f.shipping.margin === '£30' && fin.demoShippingCommercialExample().grossShippingMargin === 30);

  /* ── honesty: nothing claims an existing partnership or approval ────── */

  const allContent = [
    ...content.FOUNDER_PITCHES.map((p) => p.body),
    ...content.FOUNDER_BUSINESS_MODEL.map((b) => b.body),
    ...content.FOUNDER_TALKING_POINTS.map((t) => t.body),
    ...content.FOUNDER_DIFFICULT_QUESTIONS.map((q) => q.answer),
  ].join('\n');
  test('no material claims an existing government/trade partnership',
    !/\b(we have|we hold|our)\s+(a\s+)?partnership\b/i.test(allContent) &&
      !/\bpartnership with the\b/i.test(allContent));
  test('no material claims Amazon approval or endorsement',
    !/amazon\s+(approved|endorsed|partnered)/i.test(allContent));
  test('the trade-strategy point states it is PROSPECTIVE and unclaimed',
    /PROSPECTIVE/i.test(
      content.FOUNDER_TALKING_POINTS.find((t) => t.id === 'government_trade_strategy').body
    ) && /no partnership is claimed|we claim no existing partnership/i.test(allContent));
  // §M12 wording repair — REPOINTED: the honesty notice was reworded to be
  // channel-neutral (the static wording gate forbids naming the retail channel in
  // copy a brand/partner could see). The INVARIANT is unchanged: the notice must
  // explicitly state that NO partnership or approval is claimed, and it must still
  // name government/embassy/trade-body classes.
  test('the honesty notice is declared and says partnerships are not claimed',
    /No government, embassy, trade-body or retail-channel partnership/i.test(
      content.FOUNDER_HONESTY_NOTICE
    ));

  /* ── §41.15/§41.16 document + presentation generation ───────────────── */

  const brief = docs.renderFounderBriefHtml({
    generatedFor: 'validator',
    keyFigures: f,
    pitches: content.FOUNDER_PITCHES,
    businessModel: content.FOUNDER_BUSINESS_MODEL,
    talkingPoints: content.FOUNDER_TALKING_POINTS,
    questions: content.FOUNDER_DIFFICULT_QUESTIONS,
    practice: content.FOUNDER_MEETING_PRACTICE,
    honestyNotice: content.FOUNDER_HONESTY_NOTICE,
  });
  test('the brief is a self-contained HTML document',
    brief.startsWith('<!doctype html>') && /<\/html>$/.test(brief.trim()) &&
      !/<script/i.test(brief) && !/https?:\/\//.test(brief));
  test('the brief carries every pitch, question and the honesty notice',
    content.FOUNDER_PITCHES.every((p) => brief.includes(p.body.slice(0, 60))) &&
      content.FOUNDER_DIFFICULT_QUESTIONS.every((q) => brief.includes(q.question)) &&
      brief.includes(content.FOUNDER_HONESTY_NOTICE));
  test('the brief quotes the canonical figures', /£2,270/.test(brief) && /£2,000/.test(brief));

  const deck = docs.renderPitchDeckHtml({
    title: 'validator deck',
    slides: [
      { title: 'One', lines: ['£2,000'] },
      { title: 'Two', lines: ['£2,270'] },
    ],
    honestyNotice: content.FOUNDER_HONESTY_NOTICE,
  });
  test('the deck is a self-contained HTML presentation with one slide per entry',
    deck.startsWith('<!doctype html>') &&
      (deck.match(/class="slide"/g) || []).length === 2 &&
      deck.includes(content.FOUNDER_HONESTY_NOTICE));
  test('the formats are described honestly (HTML + print; no .pptx claim)',
    /HTML/i.test(docs.DOCUMENT_FORMAT) && /pptx export is NOT provided/i.test(docs.PRESENTATION_FORMAT));

  /* ── §41.13 partnership registry + fundraising plan honesty ─────────── */

  test('every partner target is a PROSPECTIVE route (no relationship claimed)',
    partners.FOUNDER_PARTNER_TARGETS.length >= 6 &&
      partners.FOUNDER_PARTNER_TARGETS.every((t) => t.relationshipExists === false));
  test('the status label never presents a planned approach as a partnership',
    partners.FOUNDER_PARTNER_TARGETS.every((t) =>
      /prospective route \(no partnership exists\)/.test(partners.partnerTargetStatusLabel(t))
    ));
  test('the fundraising plan claims NO commitments and states that plainly',
    partners.FUNDRAISING_PLAN.commitmentsClaimed === false &&
      partners.FUNDRAISING_PLAN.committedGbp === 0 &&
      /No investment has been committed/i.test(partners.FUNDRAISING_PLAN.note));
  test('the use of funds is complete and sums to 100%',
    partners.FUNDRAISING_PLAN.useOfFunds.reduce((n, u) => n + u.pct, 0) === 100 &&
      partners.FUNDRAISING_PLAN.useOfFunds.every((u) => u.note.length > 10));
  test('at least three funding milestones are stated',
    partners.FUNDRAISING_PLAN.milestones.length >= 3 &&
      partners.FUNDRAISING_PLAN.milestones.every((m) => m.detail.length > 20));

  /* ── §41.14 outreach generation + EXPLICIT send + zero network ──────── */

  const target = partners.FOUNDER_PARTNER_TARGETS[0];
  const draftA = outreach.generatePartnerOutreach(target, 'partner@example.org');
  const draftB = outreach.generatePartnerOutreach(target, 'partner@example.org');
  test('the generated message is recipient-specific and deterministic',
    JSON.stringify(draftA) === JSON.stringify(draftB) &&
      draftA.text.includes(target.name) && draftA.text.includes(target.market));
  test('the generated message passes the wording gate and states the honest basis',
    draftA.lintPassed === true && draftA.basis === 'deterministic_template' &&
      /no existing partnership/i.test(draftA.text));

  const unconfirmed = await outreach.sendPartnerOutreach(draftA, { confirmed: false });
  test('a send without EXPLICIT confirmation is REFUSED',
    unconfirmed.ok === false && /explicit confirmation/i.test(unconfirmed.error) &&
      unconfirmed.networkCalls === 0);

  const unsafeDraft = {
    ...draftA,
    lintPassed: false,
    lintReasons: ['validator: unverifiable claim'],
  };
  const refusedUnsafe = await outreach.sendPartnerOutreach(unsafeDraft, { confirmed: true });
  test('a message that failed the wording gate is REFUSED at send time',
    refusedUnsafe.ok === false && /wording gate/i.test(refusedUnsafe.error));

  const callsBefore = networkCalls;
  const sent = await outreach.sendPartnerOutreach(draftA, {
    confirmed: true,
    getConnection: () => null,
  });
  test('an unconfigured connection sends through the MOCK seam (unmistakably simulated)',
    sent.ok === true && sent.simulated === true && /^mock:msg-/.test(sent.messageId),
    sent.error ?? String(sent.messageId));
  test('the send made ZERO network calls',
    sent.networkCalls === 0 && networkCalls - callsBefore === 0, `observed ${networkCalls - callsBefore}`);

  /* ── §21 Super Admin only (hidden AND render-guarded) ───────────────── */

  const shell = read('src/components/layout/AdminShell.tsx');
  test('both private views are declared and hidden from non-super tiers',
    shell.includes("'founder_centre'") && shell.includes("'partnerships'") &&
      /HIDDEN_FOR_NON_SUPER = new Set\(\[/.test(shell));
  test('both private views are guarded AGAIN at render time with isSuper',
    /adminView === 'founder_centre' && \(isSuper \? <FounderInvestorCentre \/> : <AccessDenied \/>\)/.test(shell) &&
      /adminView === 'partnerships' && \(isSuper \? <PartnershipsCentre \/> : <AccessDenied \/>\)/.test(shell));
  test('the founder surfaces do not appear in the brand portal',
    !read('src/components/layout/BrandShell.tsx').includes('FounderInvestorCentre') &&
      !read('src/components/layout/BrandShell.tsx').includes('PartnershipsCentre'));

  console.log(
    failures === 0
      ? `FOUNDER_CENTRE_VALIDATION_PASS (${checks} checks)`
      : `FOUNDER_CENTRE_VALIDATION_FAIL (${failures}/${checks})`
  );
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);