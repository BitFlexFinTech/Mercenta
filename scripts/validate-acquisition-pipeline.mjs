// §Phase C — validates the acquisition workflow:
//   BI canonical prospect → ICP enrolment (same identity) → outreach preparation
//   driven by BI evidence → human approval (modify/approve/reject, invalid
//   transitions refused) → simulated send (ZERO external network) → response
//   (canonical intent classification) → Opportunity (BI snapshot) → CRM
//   relationship context over the ONE canonical message store.
// Also proves: INITIAL_LEADS is no longer the active acquisition source, the
// ten real canonical brands are the acquisition universe, RBAC is enforced in
// the domain layer, prospect-scoped isolation holds, and no duplicate
// acquisition/communication universe exists.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

let externalFetches = 0;
const originalFetch = globalThis.fetch;
const hijackedFetch = async (url) => {
  externalFetches++;
  console.log(`!! acquisition attempted external fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const ACTOR = { staffId: 'staff-001', canMutate: true };
const VIEW_ONLY = { staffId: 'staff-005', canMutate: false };

try {
  globalThis.fetch = hijackedFetch;

  const store = await server.ssrLoadModule('/src/data/prospectStore.ts');
  const acqStore = await server.ssrLoadModule('/src/data/acquisitionStore.ts');
  const acq = await server.ssrLoadModule('/src/lib/acquisition/outreachLifecycle.ts');
  const pp = await server.ssrLoadModule('/src/lib/intelligence/prospectPipeline.ts');
  const m = await server.ssrLoadModule('/src/lib/marketing.ts');
  const boot = await server.ssrLoadModule('/src/data/bootstrap.ts');
  const demoStore = await server.ssrLoadModule('/src/data/demoStore.ts');

  // ══ A. BI → ICP identity preservation ══
  const universe = store.getAcquisitionLeads();
  const tapatioLead = universe.find((l) => l.prospectId === 'prospect-tapatio');
  test('A1 the ICP acquisition universe is the canonical BI universe (10 active)',
    universe.length === 10 && store.getProspects().filter((p) => !p.disqualified).length === 10);
  test('A2 every ICP row preserves the canonical prospect identity (prospectId set)',
    universe.every((l) => typeof l.prospectId === 'string' && l.prospectId.length > 0 && l.id === `lead-${l.prospectId}`));
  test('A3 Tapatío appears in ICP as the SAME canonical prospect (prospect-tapatio)',
    !!tapatioLead && tapatioLead.company === 'Tapatío' && store.getProspect('prospect-tapatio').brand === 'Tapatío');
  test('A4 ICP segment/region are derived from the canonical BI record, not fabricated',
    tapatioLead.segment === 'Grocery' && tapatioLead.region === 'us');
  test('A5 BI record fields survive the store boot (countries + incumbentChallenged preserved)',
    JSON.stringify(store.getProspect('prospect-tapatio').countries) === JSON.stringify(['US', 'UK', 'Canada']) &&
    JSON.stringify(store.getProspect('prospect-tapatio').incumbentChallenged) === JSON.stringify(['Tabasco']));

  // ══ B. No INITIAL_LEADS universe in the active path ══
  test('B1 the seeded INITIAL_LEADS fixture is still retained (8 rows) — nothing deleted',
    boot.INITIAL_LEADS.length === 8);
  test('B2 no acquisition row comes from the INITIAL_LEADS fixture',
    universe.every((l) => !boot.INITIAL_LEADS.some((s) => s.company === l.company)));
  const ctxSrc = readFileSync('src/context/GlobalStateContext.tsx', 'utf8');
  test('B3 the app bootstrap seeds ICP from the canonical store, not setLeads(INITIAL_LEADS)',
    ctxSrc.includes('getAcquisitionLeads()') && !/setLeads\(m\.INITIAL_LEADS\)/.test(ctxSrc));
  const forbidden = /INITIAL_LEADS_V2|MOCK_PROSPECTS|FAKE_BI_LEADS|MOCK_LEADS/;
  const acqSources = [
    'src/lib/acquisition/outreachLifecycle.ts',
    'src/data/acquisitionStore.ts',
    'src/components/admin/AcquisitionPipeline.tsx',
    'src/components/admin/AcquisitionWorkflow.tsx',
    'src/components/admin/AcquisitionRelationships.tsx',
  ].map((f) => readFileSync(f, 'utf8'));
  test('B4 no second/fabricated acquisition universe or lead array anywhere in Phase C',
    acqSources.every((s) => !forbidden.test(s)));

  // ══ C. Real-brand verification ══
  const CANON = ['Tapatío', 'Seep', 'Astonish', 'Fly By Jing', 'LocknLock', "Mike's Hot Honey", 'Cholula', 'Valentina', 'Delphis Eco', 'Kit & Kin'];
  test('C1 all ten canonical BI brands are available to the acquisition workflow',
    CANON.every((b) => acq.listAcquisitionProspects().some((r) => r.prospect.brand === b)));
  test('C2 every canonical brand carries a real engine-computed BI score (no placeholder/regenerated fixtures)',
    acq.listAcquisitionProspects().every((r) => r.prospect.score.total > 0 && /^\d{4}-\d{2}-\d{2}/.test(r.prospect.score.calculatedAt)) &&
    JSON.stringify(acq.listAcquisitionProspects().map((r) => r.prospect.brand).sort()) === JSON.stringify([...CANON].sort()));
  test('C3 disqualified canonical prospects stay out of the targetable list',
    !acq.listAcquisitionProspects().some((r) => r.prospect.disqualified));

  // ══ D. BI evidence propagation into outreach ══
  const prep = acq.prepareOutreach('prospect-tapatio', ACTOR, 'email');
  test('D1 preparing outreach returns a pending_approval recommendation (revision 1)',
    prep.ok && prep.value.record.status === 'pending_approval' && prep.value.record.revision === 1);
  test('D2 the recommendation carries the BI evidence summary ("why we are contacting this brand")',
    prep.ok && /## Outreach: Tapatío/.test(prep.value.whyContact) && /Score:/.test(prep.value.whyContact));
  test('D3 the outreach copy is generated from the real BI record (brand + Amazon evidence)',
    prep.ok && prep.value.record.subject.includes('Tapatío') && /ASINs/.test(prep.value.record.body));
  test('D4 the record is keyed to the canonical prospect + its ICP lead',
    prep.ok && prep.value.record.prospectId === 'prospect-tapatio' && prep.value.record.leadId === 'lead-prospect-tapatio');
  test('D5 preparing outreach auto-enrolled the prospect (ICP enrolment is not skipped)',
    store.getProspect('prospect-tapatio').outreachStatus === 'ready_to_contact');

  // ══ E. Contact / targeting readiness ══
  const enrolled = acq.enrollProspect('p-seep', ACTOR);
  test('E1 a canonical prospect moves into an outreach-ready state (ICP enrolment)',
    enrolled.ok && enrolled.value.region === 'uk' && enrolled.value.lead.id === 'lead-p-seep');
  test('E2 enrolment moves the canonical BI outreach status to ready_to_contact',
    store.getProspect('p-seep').outreachStatus === 'ready_to_contact');
  test('E3 the canonical BI prospect timeline audits the enrolment transition',
    store.getProspectTimeline('p-seep').some((e) => e.field === 'outreachStatus' && e.after === 'ready_to_contact'));
  test('E4 the ICP row for that prospect now projects Sequenced',
    store.getAcquisitionLeads().find((l) => l.prospectId === 'p-seep').outreachStatus === 'Sequenced');
  test('E5 targeting uses the real BI contact; an unverified contact yields an unmistakable .example destination',
    enrolled.value.prospect.contacts[0].name === 'Laura Harnett' &&
    acq.outreachDestination(enrolled.value.prospect).indexOf('.example') > 0);

  // ══ F. Human approval: approve / reject / modify are distinct valid states ══
  const recId = prep.value.record.id;
  test('F1 a PENDING recommendation cannot be sent (approval is a real gate)',
    (await acq.sendOutreach(recId, ACTOR)).error.startsWith('INVALID_STATE'));
  const modified = acq.modifyOutreach(recId, { subject: 'Modified by operator', body: 'Modified body for Tapatío.' }, ACTOR);
  test('F2 MODIFY keeps it pending, bumps the revision and records who/when',
    modified.ok && modified.value.status === 'pending_approval' && modified.value.revision === 2 &&
    modified.value.modifiedBy === 'staff-001' && !!modified.value.modifiedAt);
  test('F3 MODIFY is audited on the acquisition timeline + platform audit log',
    acqStore.getAcquisitionEvents('prospect-tapatio').some((e) => e.type === 'outreach_modified') &&
    demoStore.demoAuditLog.some((e) => e.action === 'acquisition_outreach_modified' && e.entityId === 'prospect-tapatio'));
  test('F4 an empty modified body is refused (no silent corruption)',
    (acq.modifyOutreach(recId, { body: '   ' }, ACTOR)).error.startsWith('INVALID_INPUT'));

  // Reject path on a second prospect (distinct terminal state).
  const prepSeep = acq.prepareOutreach('p-seep', ACTOR, 'email');
  const rejected = acq.rejectOutreach(prepSeep.value.record.id, 'Product fit not right for Q4', ACTOR);
  test('F5 REJECT produces a distinct, audited terminal state (reason stored)',
    rejected.ok && rejected.value.status === 'rejected' && rejected.value.rejectedBy === 'staff-001' &&
    rejected.value.approvalNote === 'Product fit not right for Q4');
  test('F6 a rejected recommendation cannot then be approved',
    (acq.approveOutreach(prepSeep.value.record.id, ACTOR)).error.startsWith('INVALID_STATE'));
  test('F7 approval/rejection audit rows exist in the platform audit log',
    demoStore.demoAuditLog.some((e) => e.action === 'acquisition_outreach_rejected' && e.entityId === 'p-seep') &&
    demoStore.demoAuditLog.some((e) => e.action === 'acquisition_outreach_prepared'));

  // ══ G. Simulated send ══
  const approved = acq.approveOutreach(recId, ACTOR, 'Ready to contact');
  test('G1 APPROVE is a distinct valid transition (approved + auditor recorded)',
    approved.ok && approved.value.status === 'approved' && approved.value.approvedBy === 'staff-001');
  const sent = await acq.sendOutreach(recId, ACTOR);
  test('G2 an APPROVED recommendation sends through the deterministic simulation path',
    sent.ok && sent.value.transport === 'simulation' && sent.value.record.status === 'sent' && !!sent.value.record.sentAt);
  test('G3 the simulated send is unmistakably labelled and addressed to a placeholder destination',
    sent.value.destination.indexOf('.example') > 0 && sent.value.message.body.startsWith('[SIMULATED SEND'));
  test('G4 the send is logged into the ONE canonical message store (not a new store)',
    demoStore.demoMessages.some((msg) => msg.id === sent.value.message.id && msg.brandId === 'prospect-tapatio'));
  test('G5 the canonical prospect advanced to contacted and is audited',
    store.getProspect('prospect-tapatio').outreachStatus === 'contacted' &&
    store.getProspectTimeline('prospect-tapatio').some((e) => e.field === 'outreachStatus' && e.after === 'contacted'));

  // ══ H. No external network on the simulation path ══
  test('H1 ZERO external network calls across the whole acquisition workflow', externalFetches === 0);
  test('H2 the engine reaches the provider seam, never a hard-coded transport',
    readFileSync('src/lib/acquisition/outreachLifecycle.ts', 'utf8').includes('simulationOutreachTransport') &&
    !/fetch\(/.test(readFileSync('src/lib/acquisition/outreachLifecycle.ts', 'utf8')));

  // ══ I. Response handling ══
  const response = await acq.simulateResponse('prospect-tapatio', ACTOR);
  test('I1 a deterministic simulated response is associated with the SAME prospect',
    response.ok && response.value.prospectId === 'prospect-tapatio' && response.value.simulated === true &&
    response.value.outreachId === recId);
  test('I2 the response body is unmistakably simulated and intent-classified by the canonical contract',
    response.value.body.startsWith('[SIMULATED REPLY') &&
    response.value.wantsHuman === m.classifyInboundReply(response.value.body).wantsHuman &&
    response.value.wantsHuman === true);
  test('I3 the inbound reply is logged inbound on the canonical thread (requiresHuman from classification)',
    demoStore.demoMessages.some((msg) => msg.brandId === 'prospect-tapatio' && msg.direction === 'inbound' && msg.requiresHuman === true));
  test('I4 the canonical prospect advanced to interested and is audited',
    store.getProspect('prospect-tapatio').outreachStatus === 'interested' &&
    store.getProspectTimeline('prospect-tapatio').some((e) => e.field === 'outreachStatus' && e.after === 'interested'));
  test('I5 a response cannot be simulated before a send (no fabricated inbound)',
    (await acq.simulateResponse('p-kitkin', ACTOR)).error.startsWith('NO_SENT_OUTREACH'));

  // ══ J. Opportunity ══
  test('J1 an opportunity cannot exist before a response',
    acq.createOpportunityFromResponse('p-kitkin', ACTOR).error.startsWith('NO_RESPONSE'));
  const opportunity = acq.createOpportunityFromResponse('prospect-tapatio', ACTOR);
  test('J2 an opportunity is created from the qualified response with the canonical identity',
    opportunity.ok && opportunity.value.prospectId === 'prospect-tapatio' && opportunity.value.id === 'opp-prospect-tapatio');
  test('J3 the opportunity snapshots the BI score/tier + BI evidence (never re-derived)',
    opportunity.value.biScore === store.getProspect('prospect-tapatio').score.total &&
    opportunity.value.biTier === store.getProspect('prospect-tapatio').score.tier &&
    /## Outreach: Tapatío/.test(opportunity.value.evidenceSummary));
  test('J4 a hot response qualifies the opportunity and moves the prospect to meeting_scheduled',
    opportunity.value.stage === 'qualified' && store.getProspect('prospect-tapatio').outreachStatus === 'meeting_scheduled');
  test('J5 opportunity stage transitions are validated (illegal jumps refused)',
    acq.setOpportunityStage('opp-prospect-tapatio', 'new', ACTOR).error.startsWith('ILLEGAL_TRANSITION') &&
    acq.setOpportunityStage('opp-prospect-tapatio', 'won', ACTOR).ok === true);
  const tapatioOpportunity = acqStore.getOpportunityForProspect('prospect-tapatio');
  test('J6 re-running the opportunity step is idempotent on the same record (terminal stages never regress)',
    acq.createOpportunityFromResponse('prospect-tapatio', ACTOR).ok === true &&
    acqStore.getOpportunities().filter((o) => o.prospectId === 'prospect-tapatio').length === 1 &&
    tapatioOpportunity.id === 'opp-prospect-tapatio' && tapatioOpportunity.stage === 'won');

  // ══ K. CRM relationship context ══
  const rel = acq.getRelationshipContext('prospect-tapatio');
  test('K1 the CRM relationship context carries the BI prospect + opportunity',
    rel !== null && rel.prospect.id === 'prospect-tapatio' && rel.opportunity.id === 'opp-prospect-tapatio');
  test('K2 it carries the full outreach/revision history and the response',
    rel.outreach.length === 1 && rel.current.id === recId && rel.responses.length === 1);
  test('K3 it carries the audited acquisition timeline',
    rel.events.length >= 6 && rel.events.some((e) => e.type === 'opportunity_created'));
  test('K4 the relationship is prospect-scoped — no other prospect leaks in',
    rel.outreach.every((o) => o.prospectId === 'prospect-tapatio') &&
    rel.responses.every((r) => r.prospectId === 'prospect-tapatio') &&
    rel.messages.every((msg) => msg.brandId === 'prospect-tapatio'));
  const seepRel = acq.getRelationshipContext('p-seep');
  test('K5 a different prospect has its own isolated relationship (rejected, no opportunity)',
    seepRel.opportunity === null && seepRel.responses.length === 0 &&
    seepRel.current.status === 'rejected' && seepRel.messages.length === 0);

  // ══ L. Communication is canonical + not duplicated ══
  test('L1 the relationship messages ARE the canonical demoMessages rows for that identity',
    rel.messages.length === demoStore.demoMessages.filter((msg) => msg.brandId === 'prospect-tapatio').length &&
    rel.messages.every((msg) => demoStore.demoMessages.includes(msg)));
  test('L2 the CRM relationship component renders the canonical store (no second conversation store)',
    readFileSync('src/components/admin/AcquisitionRelationships.tsx', 'utf8').includes('AcquisitionWorkflow') &&
    readFileSync('src/lib/acquisition/outreachLifecycle.ts', 'utf8').includes("from '@/data/api'"));
  test('L3 no acquisition module keeps its own messages store',
    acqSources.every((s) => !/messages\s*[:=]\s*\[\]/.test(s)));
  test('L4 the acquisition conversation cannot collide with an onboarded brand tenant id',
    demoStore.demoBrands.every((b) => !store.getProspects().some((p) => p.id === b.id)));

  // ══ M. Tenant isolation ══
  test('M1 every acquisition artefact is keyed by the canonical prospect id only',
    acqStore.getOutreachRecords().every((o) => o.prospectId.startsWith('prospect-') || o.prospectId.startsWith('p-')) &&
    acqStore.getResponses().every((r) => r.prospectId.startsWith('prospect-') || r.prospectId.startsWith('p-')));
  test('M2 a brand-tenant session id is never an acquisition key (no cross-tenant read)',
    acqStore.getOutreachRecords().every((o) => !demoStore.demoBrands.some((b) => b.id === o.prospectId)));

  // ══ N. RBAC (domain layer, not a decorative label) ══
  const prep2 = acq.prepareOutreach('p-astonish', ACTOR, 'email');
  const guards = [
    acq.enrollProspect('p-lockn', VIEW_ONLY),
    acq.prepareOutreach('p-lockn', VIEW_ONLY),
    acq.modifyOutreach(prep2.value.record.id, { subject: 'x' }, VIEW_ONLY),
    acq.approveOutreach(prep2.value.record.id, VIEW_ONLY),
    acq.rejectOutreach(prep2.value.record.id, 'no', VIEW_ONLY),
    await acq.sendOutreach(prep2.value.record.id, VIEW_ONLY),
    await acq.simulateResponse('p-astonish', VIEW_ONLY),
    acq.createOpportunityFromResponse('p-astonish', VIEW_ONLY),
    acq.setOpportunityStage('opp-prospect-tapatio', 'lost', VIEW_ONLY),
  ];
  test('N1 every acquisition mutation refuses a view-only actor', guards.every((g) => !g.ok && g.error.startsWith('FORBIDDEN')));
  test('N2 the refused actions changed no state',
    acqStore.getOutreachForProspect('p-lockn').length === 0 &&
    acqStore.getOpportunityForProspect('p-astonish') === null &&
    acqStore.getOpportunityForProspect('prospect-tapatio').stage === 'won');

  // ══ O. Persistence / reload semantics (documented, not fabricated) ══
  test('O1 acquisition state is IN-MEMORY for the session (deterministic reset helper)',
    acqStore.getOutreachRecords().length > 0 && typeof acqStore.resetAcquisitionStore === 'function');
  acqStore.resetAcquisitionStore();
  test('O2 after a reset the acquisition store is empty while the BI universe re-boots deterministically',
    acqStore.getOutreachRecords().length === 0 && acqStore.getOpportunities().length === 0 &&
    acqStore.getResponses().length === 0 && acqStore.getAcquisitionEvents().length === 0 &&
    store.getProspects().length === 12 && store.getAcquisitionLeads().length === 10);
  store.resetProspectStore();
  test('O3 a full re-boot (prospect store reset) returns the ICP projection to the canonical not-enrolled stage',
    store.getProspects().length === 12 && store.getAcquisitionLeads().length === 10 &&
    store.getAcquisitionLeads().every((l) => l.outreachStatus === 'Scraped') &&
    acq.getAcquisitionSummary().enrolled === 0);
  test('O4 no Supabase/network persistence is claimed or attempted for acquisition state',
    externalFetches === 0);

  console.log(failures === 0 ? 'ACQUISITION_PIPELINE_VALIDATION_PASS' : `ACQUISITION_PIPELINE_VALIDATION_FAIL (${failures})`);
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
if (failures > 0) process.exit(1);
