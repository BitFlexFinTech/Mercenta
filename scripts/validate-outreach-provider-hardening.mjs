// §Phase D3 — validates outreach/provider hardening:
//   · the FULL human-approval workflow: prepare → modify → approve, reject →
//     re-prepare → re-approve, illegal transitions refused, simulated send,
//     response, Opportunity, CRM relationship context
//   · transport resolution DERIVED from the canonical integration mode model
//     (never caller booleans): live / sandbox / not_configured / unavailable
//   · FAIL-CLOSED: a transport claiming `live` without verified credentials is
//     REFUSED by the domain — an unavailable provider is never silently live
//   · UNKNOWN ≠ LIVE: disconnected / available / configuring / degraded / error /
//     disabled / no-client states all resolve to the simulation transport
//   · simulation performs ZERO network calls; a real provider send is reachable
//     ONLY through a positively-live state WITH verified credentials
//   · human approval works with no Rakazo and no Postiz involvement
//   · RBAC + prospect-scoped isolation intact
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

// Any attempt to leave the process is a hard failure.
let externalFetches = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  externalFetches++;
  console.log(`!! outreach hardening attempted EXTERNAL fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const ACTOR = { staffId: 'staff-001', canMutate: true };
const VIEW_ONLY = { staffId: 'staff-005', canMutate: false };

try {
  const store = await server.ssrLoadModule('/src/data/prospectStore.ts');
  const acqStore = await server.ssrLoadModule('/src/data/acquisitionStore.ts');
  const acq = await server.ssrLoadModule('/src/lib/acquisition/outreachLifecycle.ts');
  const sender = await server.ssrLoadModule('/src/lib/acquisition/outreachSender.ts');
  const email = await server.ssrLoadModule('/src/lib/messaging/email.ts');

  acqStore.resetAcquisitionStore();
  store.resetProspectStore();
  store.ensureProspectStore();

  const PID = 'prospect-tapatio';

  // ══ A. Full human-approval workflow (no Rakazo, no Postiz) ══
  const prepared = acq.prepareOutreach(PID, ACTOR, 'email');
  test('A1 prepare creates a revision 1 recommendation awaiting human approval',
    prepared.ok === true && prepared.value.record.status === 'pending_approval'
    && prepared.value.record.revision === 1);
  const r1 = prepared.value.record;

  const modified = acq.modifyOutreach(r1.id, { subject: 'Edited subject', body: 'Edited body — operator review' }, ACTOR);
  const r1After = acqStore.getOutreachById(r1.id);
  test('A2 MODIFY edits the body and increments the revision, still awaiting approval',
    modified.ok === true && r1After.revision === 2 && r1After.body === 'Edited body — operator review'
    && r1After.modifiedBy === ACTOR.staffId && r1After.status === 'pending_approval');

  const approved1 = acq.approveOutreach(r1.id, ACTOR, 'Approved after edit');
  const r1Approved = acqStore.getOutreachById(r1.id);
  test('A3 APPROVE after modification is a real, audited transition',
    approved1.ok === true && r1Approved.status === 'approved' && r1Approved.approvedBy === ACTOR.staffId
    && !!r1Approved.approvedAt && r1Approved.approvalNote === 'Approved after edit');

  const sent = await acq.sendOutreach(r1.id, ACTOR);
  test('A4 the default transport sends through the deterministic SIMULATION path',
    sent.ok === true && sent.value.transport === 'simulation' && sent.value.record.status === 'sent'
    && !!sent.value.record.sentAt && sent.value.message.body.startsWith('[SIMULATED SEND'));
  test('A5 the send lands in the ONE canonical message store (always-log rule)',
    acqStore.getRelationship(PID).messages.some((m) => m.id === sent.value.message.id));

  const responded = await acq.simulateResponse(PID, ACTOR);
  test('A6 the simulated inbound response is intent-classified and does not claim to be live',
    responded.ok === true && responded.value.simulated === true
    && typeof responded.value.wantsHuman === 'boolean' && !!responded.value.classificationReason);
  const opp = acq.createOpportunityFromResponse(PID, ACTOR);
  test('A7 an Opportunity is created from the response, carrying the BI snapshot',
    opp.ok === true && opp.value.prospectId === PID && /^opp-/.test(opp.value.id)
    && typeof opp.value.biScore === 'number' && !!opp.value.biTier);
  const rel = acq.getRelationshipContext(PID);
  test('A8 the CRM relationship context is complete (BI + outreach + response + opportunity + messages)',
    !!rel && rel.prospect.id === PID && rel.outreach.length >= 1 && rel.responses.length === 1
    && !!rel.opportunity && rel.messages.length >= 2);
  const prepared2 = acq.prepareOutreach(PID, ACTOR, 'email');
  const rejected = acq.rejectOutreach(prepared2.value.record.id, 'Wrong contact identified', ACTOR);
  const rejectedAfter = acqStore.getOutreachById(prepared2.value.record.id);
  test('A9 REJECT is a distinct terminal state for that revision',
    rejected.ok === true && rejectedAfter.status === 'rejected' && rejectedAfter.rejectedBy === ACTOR.staffId);

  const prepared3 = acq.prepareOutreach(PID, ACTOR, 'email');
  test('A10 re-preparing after a rejection creates a NEW revision (the rejected one is preserved)',
    prepared3.ok === true && prepared3.value.record.id !== prepared2.value.record.id
    && prepared3.value.record.revision === 3 && prepared3.value.record.status === 'pending_approval'
    && acqStore.getOutreachById(prepared2.value.record.id).status === 'rejected');

  const approved3 = acq.approveOutreach(prepared3.value.record.id, ACTOR, 'Approved replacement');
  test('A11 the replacement revision can be approved (re-approve after a rejected revision)',
    approved3.ok === true && approved3.value.status === 'approved');

  const sendRejected = await acq.sendOutreach(prepared2.value.record.id, ACTOR);
  test('A12 illegal transitions are refused (double-approve, modify-approved, send-rejected)',
    acq.approveOutreach(prepared3.value.record.id, ACTOR).ok === false
    && acq.modifyOutreach(prepared3.value.record.id, { body: 'x' }, ACTOR).ok === false
    && sendRejected.ok === false);
  test('A13 a view-only actor is refused on every mutating step',
    acq.prepareOutreach(PID, VIEW_ONLY).ok === false
    && acq.approveOutreach(prepared3.value.record.id, VIEW_ONLY).ok === false
    && acq.rejectOutreach(prepared3.value.record.id, 'x', VIEW_ONLY).ok === false
    && acq.modifyOutreach(prepared3.value.record.id, { body: 'x' }, VIEW_ONLY).ok === false);

  // ══ B. Transport resolution from the canonical mode model ══
  let providerFetches = 0;
  const spyProviderTransport = async () => {
    providerFetches++;
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  const clientFor = (state) =>
    email.createEmailClient(
      () => (state.status === 'connected'
        ? { secretRef: `vault:email-${state.provider ?? 'postmark'}`, provider: state.provider ?? 'postmark', verified: !state.sandbox }
        : null),
      '/functions/v1/send-email',
      spyProviderTransport
    );

  const connectedLive = { status: 'connected', sandbox: false, provider: 'postmark' };
  const connectedSandbox = { status: 'connected', sandbox: true, provider: 'postmark' };
  const disconnected = { status: 'disconnected', sandbox: false };
  const connectingState = { status: 'connecting' };
  const errored = { status: 'needs_attention', sandbox: false, error: 'auth failed' };
  const degraded = { status: 'needs_attention', sandbox: false };
  const disabledState = { status: 'disconnected', sandbox: false, disabled: true };
  const rLive = sender.resolveOutreachTransport(connectedLive, clientFor(connectedLive));
  test('B1 a positively-LIVE state with verified credentials resolves to a live transport',
    rLive.live === true && rLive.providerState === 'live' && rLive.resolvedMode === 'live'
    && rLive.transport.mode === 'live' && sender.isVerifiedLiveTransport(rLive.transport) === true);

  const rSandbox = sender.resolveOutreachTransport(connectedSandbox, clientFor(connectedSandbox));
  test('B2 a SANDBOX connection resolves to the simulation transport, never live',
    rSandbox.live === false && rSandbox.providerState === 'sandbox' && rSandbox.transport.mode === 'simulation'
    && sender.isVerifiedLiveTransport(rSandbox.transport) === false);

  const rUnverifiedLive = sender.resolveOutreachTransport(connectedLive, {
    async send() { return { ok: true }; },
    isLive: () => false,
  });
  test('B3 FAIL-CLOSED: a live state whose credentials are NOT verified is downgraded (never silently live)',
    rUnverifiedLive.live === false && rUnverifiedLive.providerState === 'unavailable'
    && rUnverifiedLive.transport.mode === 'simulation');

  const rNoClient = sender.resolveOutreachTransport(connectedLive, null);
  test('B4 FAIL-CLOSED: a live state with no provider client resolves to unavailable, never live',
    rNoClient.live === false && rNoClient.providerState === 'unavailable'
    && rNoClient.transport === sender.simulationOutreachTransport);

  const rDisconnected = sender.resolveOutreachTransport(disconnected, clientFor(disconnected));
  const rUndefined = sender.resolveOutreachTransport(undefined, clientFor({ status: 'disconnected', sandbox: false }));
  const rConnecting = sender.resolveOutreachTransport(connectingState, clientFor(connectingState));
  test('B5 UNKNOWN ≠ LIVE: disconnected / undefined / configuring resolve to not_configured simulation',
    [rDisconnected, rUndefined, rConnecting].every((r) => r.live === false
      && r.providerState === 'not_configured' && r.transport === sender.simulationOutreachTransport));

  const rErrored = sender.resolveOutreachTransport(errored, clientFor(errored));
  const rDegraded = sender.resolveOutreachTransport(degraded, clientFor(degraded));
  const rDisabled = sender.resolveOutreachTransport(disabledState, clientFor(disabledState));
  test('B6 degraded / error / disabled resolve to unavailable (simulation), never live',
    [rErrored, rDegraded, rDisabled].every((r) => r.live === false
      && r.providerState === 'unavailable' && r.transport === sender.simulationOutreachTransport));

  test('B7 the resolver reports the canonical registry mode it derived from (single source of truth)',
    rLive.resolvedMode === 'live' && rSandbox.resolvedMode === 'simulation'
    && rDisconnected.resolvedMode === 'available' && rErrored.resolvedMode === 'error'
    && rDegraded.resolvedMode === 'degraded' && rDisabled.resolvedMode === 'disabled');

  test('B8 the default demo state (no email connection) is simulation — the workflow is never blocked',
    sender.simulationOutreachTransport.providerState === 'not_configured'
    && sender.simulationOutreachTransport.mode === 'simulation');

  test('B9 honest provider descriptions are exposed for the operator surface',
    sender.describeOutreachProvider('live') === 'connected provider (verified)'
    && sender.describeOutreachProvider('sandbox').startsWith('sandbox provider')
    && sender.describeOutreachProvider('unavailable').startsWith('provider unavailable')
    && sender.describeOutreachProvider('not_configured').startsWith('simulation'));
  // ══ C. Domain fail-closed live gate ══
  const demoStore = await server.ssrLoadModule('/src/data/demoStore.ts');
  const auditsBefore = demoStore.demoAuditLog.filter((a) => a.action === 'acquisition_outreach_send_refused').length;
  const messagesBeforeRefusals = acqStore.getRelationship(PID).messages.length;

  const lyingLive = { mode: 'live', providerState: 'live', async send() { return { ok: true }; } };
  const refusedNoVerifier = await acq.sendOutreach(prepared3.value.record.id, ACTOR, lyingLive);
  test('C1 FAIL-CLOSED: a transport claiming live with NO credential verifier is REFUSED',
    refusedNoVerifier.ok === false && /PROVIDER_NOT_LIVE/.test(refusedNoVerifier.error));

  const lyingFalse = {
    mode: 'live', providerState: 'live', isVerifiedLive: () => false,
    async send() { return { ok: true }; },
  };
  const refusedUnverified = await acq.sendOutreach(prepared3.value.record.id, ACTOR, lyingFalse);
  test('C2 FAIL-CLOSED: a transport claiming live whose verifier returns false is REFUSED',
    refusedUnverified.ok === false && /PROVIDER_NOT_LIVE/.test(refusedUnverified.error));

  test('C3 a refused send does not mutate the revision, log a message, or audit a success',
    acqStore.getOutreachById(prepared3.value.record.id).status === 'approved'
    && acqStore.getRelationship(PID).messages.length === messagesBeforeRefusals);
  test('C4 each refusal is audited as acquisition_outreach_send_refused',
    demoStore.demoAuditLog.filter((a) => a.action === 'acquisition_outreach_send_refused').length === auditsBefore + 2);

  const verifiedButSandbox = {
    mode: 'live', providerState: 'live', isVerifiedLive: () => true,
    async send() { return { ok: true, sandbox: true }; },
  };
  const sentSandbox = await acq.sendOutreach(prepared3.value.record.id, ACTOR, verifiedButSandbox);
  test('C5 defence in depth: a live-claiming transport that reports a sandbox outcome is recorded SIMULATION',
    sentSandbox.ok === true && sentSandbox.value.transport === 'simulation'
    && sentSandbox.value.record.transport === 'simulation');

  // The ONE legitimate live path: verified-live state → real provider seam.
  const prepared4 = acq.prepareOutreach(PID, ACTOR, 'email');
  acq.approveOutreach(prepared4.value.record.id, ACTOR, 'live path');
  const liveTransport = sender.resolveOutreachTransport(connectedLive, clientFor(connectedLive)).transport;
  const fetchesBeforeLive = providerFetches;
  const sentLive = await acq.sendOutreach(prepared4.value.record.id, ACTOR, liveTransport);
  test('C6 a VERIFIED-live transport reaches the provider seam and is recorded as live',
    sentLive.ok === true && sentLive.value.transport === 'live'
    && sentLive.value.record.transport === 'live' && providerFetches === fetchesBeforeLive + 1);
  test('C7 the live message is NOT prefixed as simulated (honest logging)',
    !sentLive.value.message.body.startsWith('[SIMULATED SEND'));

  // ══ D. Simulation never touches the network ══
  const fetchesAfterLive = providerFetches;
  await sender.simulationOutreachTransport.send({ to: 'x@y.example', subject: 's', body: 'b' });
  test('D1 invoking the simulation transport performs NO provider call and NO network',
    providerFetches === fetchesAfterLive && externalFetches === 0);
  const sandboxSend = await rSandbox.transport.send({ to: 'x@y.example', subject: 's', body: 'b' });
  test('D2 a sandbox provider send is reported sandbox and never reaches the provider',
    sandboxSend.ok === true && sandboxSend.sandbox === true && providerFetches === fetchesAfterLive
    && externalFetches === 0);
  const clientNoCreds = email.createEmailClient(() => null, '/functions/v1/send-email', spyProviderTransport);
  const noCredsResult = await clientNoCreds.send({ to: 'x@y.example', subject: 's', body: 'b' });
  test('D3 missing credentials are reported as NOT_CONNECTED and never break simulation',
    noCredsResult.ok === false && noCredsResult.error === 'EMAIL_NOT_CONNECTED'
    && providerFetches === fetchesAfterLive
    && sender.resolveOutreachTransport(disconnected, clientNoCreds).live === false);

  // ══ E. Never silently live ══
  const liveRecords = acqStore.getOutreachRecords().filter((o) => o.transport === 'live');
  test('E1 exactly ONE record is recorded as live — the verified-live send, nothing else',
    liveRecords.length === 1 && liveRecords[0].id === prepared4.value.record.id);
  test('E2 isVerifiedLiveTransport is false for the simulation transport and for a live claim with no verifier',
    sender.isVerifiedLiveTransport(sender.simulationOutreachTransport) === false
    && sender.isVerifiedLiveTransport(lyingLive) === false);
  const tLying = sender.transportFromEmailClient({ async send() { return { ok: true }; }, isLive: () => false }, true);
  const tHonest = sender.transportFromEmailClient({ async send() { return { ok: true }; }, isLive: () => true }, true);
  const tSandboxAdapter = sender.transportFromEmailClient({ async send() { return { ok: true }; }, isLive: () => true }, false);
  test('E3 the low-level adapter refuses a live claim unless the client itself verifies credentials',
    sender.isVerifiedLiveTransport(tLying) === false && sender.isVerifiedLiveTransport(tHonest) === true
    && sender.isVerifiedLiveTransport(tSandboxAdapter) === false && tSandboxAdapter.providerState === 'sandbox');
  // ══ F. Rakazo / Postiz independence for human approval ══
  const sources = [
    'src/lib/acquisition/outreachLifecycle.ts',
    'src/lib/acquisition/outreachSender.ts',
    'src/data/acquisitionStore.ts',
    'src/lib/intelligence/prospectIntelligence.ts',
  ].map((f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
  test('F1 the acquisition + human-approval path has NO Rakazo or Postiz dependency (source-verified)',
    sources.every((s) => !/rakazo|postiz/i.test(s)));
  test('F2 no Rakazo/Postiz export is required by the acquisition domain',
    Object.keys(acq).every((k) => !/rakazo|postiz/i.test(k))
    && Object.keys(sender).every((k) => !/rakazo|postiz/i.test(k)));
  test('F3 the whole approval workflow ran with NO external service contacted (Rakazo/Postiz/provider)',
    externalFetches === 0);

  // ══ G. Isolation ══
  const otherRel = acqStore.getRelationship('prospect-cholula');
  test('G1 prospect-scoped isolation: another prospect shows no outreach/response/opportunity leakage',
    !!otherRel && otherRel.outreach.length === 0 && otherRel.responses.length === 0
    && otherRel.opportunity === null && otherRel.messages.length === 0);
  test('G2 every stored artefact is keyed to the canonical prospect id',
    acqStore.getOutreachRecords().every((o) => o.prospectId === PID)
    && acqStore.getResponses().every((r) => r.prospectId === PID)
    && acqStore.getOpportunities().every((o) => o.prospectId === PID));

  // ══ I. Revision-history integrity (Phase D3 id-collision regression) ══
  acqStore.resetAcquisitionStore();
  const rapid = [0, 1, 2].map(() => acq.prepareOutreach(PID, ACTOR, 'email'));
  const rapidIds = rapid.map((r) => r.value.record.id);
  test('I1 rapid consecutive preparations create THREE distinct records — no id collision, no overwrite',
    new Set(rapidIds).size === 3 && acqStore.getOutreachRecords().length === 3
    && rapidIds.join(',') === `outreach-${PID}-r1,outreach-${PID}-r2,outreach-${PID}-r3`);
  test('I2 the record id is deterministic per prospect+revision (workflow-owned, not Date.now())',
    acq.outreachRecordId('prospect-x', 7) === 'outreach-prospect-x-r7'
    && acq.outreachRecordId(PID, 1) === `outreach-${PID}-r1`);
  test('I3 every stored revision is preserved with its own revision number (history never discarded)',
    acqStore.getOutreachRecords().map((o) => o.revision).join(',') === '1,2,3');

  // ══ H. Safety summary ══
  test('H1 ZERO external network calls across the entire outreach/provider hardening suite',
    externalFetches === 0);

  console.log(failures === 0
    ? 'OUTREACH_PROVIDER_HARDENING_VALIDATION_PASS'
    : `OUTREACH_PROVIDER_HARDENING_VALIDATION_FAIL (${failures})`);
} catch (err) {
  console.log('VALIDATOR ERROR: ' + (err && err.stack ? err.stack : String(err)));
  failures++;
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
if (failures > 0) process.exit(1);




