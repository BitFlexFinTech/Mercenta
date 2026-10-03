/**
 * §SSOT S7 — THE CONTRACT-CLOSING-PATH GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * `demoContracts` was the ONE canonical collection in the platform with NO writer
 * anywhere — every reference was a READ — and `ContractsAdminPanel` kept its
 * drafts in LOCAL React state (`extraDrafts`), so a generated agreement, a renewal
 * draft and a track amendment all vanished on reload. The work layer's
 * `contract_renewal` item therefore had NO closing path
 * (`WORK_SOURCE_CLOSING.contract_renewal.writer === null`, a declared gap).
 *
 * WHAT IT PROVES (against the REAL modules — no mocks, ZERO network)
 * ------------------------------------------------------------------
 *   1. The work layer now declares a WRITER for `contract_renewal` naming the two
 *      canonical writers, and it is no longer a declared gap.
 *   2. `saveContractDraft` writes to the CANONICAL collection (idempotent by id)
 *      and is audited on the existing platform log.
 *   3. `renewContract` advances the term and CLEARS the work item BY DOING THE
 *      WORK; a terminated contract is refused.
 *   4. `terminateContract` sets the terminated status, is audited, clears the
 *      item, is idempotent and refuses an unknown contract.
 *   5. The PANEL holds no second source of truth (no local draft state) and routes
 *      every draft/closure through the canonical writers.
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* ZERO NETWORK: any external call is counted and made to fail the run. */
globalThis.fetch = function () {
  throw new Error('NETWORK_CALL_ATTEMPTED');
};

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
const test = (name, ok, detail) => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || detail === undefined ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};

try {
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const work = await server.ssrLoadModule('/src/lib/work/workStore.ts');

  const panelSrc = readFileSync(
    resolve(process.cwd(), 'src/components/admin/ContractsAdminPanel.tsx'),
    'utf8'
  );
  const workSrc = readFileSync(resolve(process.cwd(), 'src/lib/work/workStore.ts'), 'utf8');

  /* ── 1. the declared closing path is real ─────────────────────────────────── */
  const closing = work.WORK_SOURCE_CLOSING.contract_renewal;
  test(
    'the work layer declares a WRITER for contract_renewal (no longer a gap)',
    typeof closing.writer === 'string' && closing.writer.length > 0,
    String(closing.writer)
  );
  test(
    'the declared writer NAMES the two canonical writers',
    typeof closing.writer === 'string' &&
      closing.writer.includes('renewContract') &&
      closing.writer.includes('terminateContract')
  );
  test(
    'contract_renewal is no longer in the declared gaps',
    !work.WORK_SOURCE_CLOSING_GAPS.includes('contract_renewal'),
    work.WORK_SOURCE_CLOSING_GAPS.join(', ')
  );
  test(
    'the work layer records the S7 closure at source (no null writer for contract_renewal)',
    /contract_renewal:\s*\{[\s\S]*?writer:\s*'renewContract \/ terminateContract'/.test(workSrc)
  );

  /* ── 2. saveContractDraft writes to the CANONICAL store ───────────────────── */
  const before = store.demoContracts.length;
  const auditBefore = store.demoAuditLog.length;
  const draft = {
    id: 'contract-batch3a-draft',
    brandId: 'brand-batch3a',
    type: 'distribution_agreement',
    status: 'draft',
    commissionRate: 12,
    monthlyFee: 250,
    fulfillmentTrack: 'financed',
    effectiveDate: '2026-01-01',
    renewalDate: '2027-01-01',
    documentUrl: '',
    signatories: [],
    version: 1,
  };
  const saved = store.saveContractDraft(draft, 'staff:test');
  test(
    'saveContractDraft stores the draft in the canonical collection',
    saved === draft &&
      store.demoContracts.length === before + 1 &&
      store.demoContracts.some((c) => c.id === draft.id)
  );
  test(
    'saveContractDraft is audited on the existing platform log',
    store.demoAuditLog.length === auditBefore + 1 &&
      store.demoAuditLog.some(
        (a) => a.action === 'contract_draft_created' && a.entityType === 'contract' && a.entityId === draft.id
      )
  );
  const afterFirst = store.demoContracts.length;
  store.saveContractDraft({ ...draft, commissionRate: 15 }, 'staff:test');
  test(
    'saveContractDraft is idempotent by id (updates in place, never duplicates)',
    store.demoContracts.length === afterFirst &&
      store.demoContracts.find((c) => c.id === draft.id).commissionRate === 15
  );

  /* ── 3. RENEW clears the work item BY DOING THE WORK ──────────────────────── */
  const today = work.demoToday();
  const soon = new Date(new Date(today).getTime() + 5 * 864e5).toISOString().slice(0, 10);
  const approaching = {
    ...draft,
    id: 'contract-batch3a-renew',
    brandId: 'brand-batch3a-renew',
    renewalDate: soon,
    status: 'active',
  };
  store.saveContractDraft(approaching, 'staff:test');
  const renewalItemId = work.workItemId('contract_renewal', approaching.id);
  const hasItem = () =>
    work.getWorkItems('admin', null, { includeResolved: true }).some((w) => w.id === renewalItemId);
  test('an approaching contract raises its contract_renewal work item', hasItem());

  const priorTerm = approaching.renewalDate;
  const priorVersion = approaching.version;
  const renewed = store.renewContract(approaching.id, 'staff:test');
  test(
    'renewContract advances the term (effectiveDate = old renewal; renewalDate a year on; version bumped)',
    renewed &&
      renewed.effectiveDate === priorTerm &&
      renewed.renewalDate > soon &&
      renewed.version === priorVersion + 1
  );
  test('renewing CLEARS the work item (the term left the horizon)', !hasItem());

  test(
    'renewing a TERMINATED contract is refused (null, unchanged)',
    (() => {
      store.saveContractDraft(
        { ...draft, id: 'contract-batch3a-termy', brandId: 'brand-batch3a-termy', renewalDate: soon, status: 'active' },
        'staff:test'
      );
      store.terminateContract('contract-batch3a-termy', 'staff:test', 'ended');
      const r = store.renewContract('contract-batch3a-termy', 'staff:test');
      return (
        r === null &&
        store.demoContracts.find((c) => c.id === 'contract-batch3a-termy').status === 'terminated'
      );
    })()
  );

  /* ── 4. TERMINATE clears the item (the other closing path) ────────────────── */
  store.saveContractDraft(
    { ...draft, id: 'contract-batch3a-term', brandId: 'brand-batch3a-term', renewalDate: soon, status: 'active' },
    'staff:test'
  );
  const termItemId = work.workItemId('contract_renewal', 'contract-batch3a-term');
  const hasTermItem = () =>
    work.getWorkItems('admin', null, { includeResolved: true }).some((w) => w.id === termItemId);
  test('the terminating case starts with its work item', hasTermItem());

  const auditBeforeTerm = store.demoAuditLog.length;
  const terminated = store.terminateContract('contract-batch3a-term', 'staff:test', 'Terminated for the gate');
  test(
    'terminateContract sets status terminated and is audited',
    terminated &&
      terminated.status === 'terminated' &&
      store.demoAuditLog.some(
        (a) =>
          a.action === 'contract_terminated' &&
          a.entityId === 'contract-batch3a-term' &&
          a.reason === 'Terminated for the gate'
      )
  );
  test('terminating CLEARS the work item', !hasTermItem());
  test(
    'terminateContract is idempotent (a second call changes nothing, adds no audit)',
    store.terminateContract('contract-batch3a-term', 'staff:test', 'again')?.status === 'terminated' &&
      store.demoAuditLog.length === auditBeforeTerm + 1
  );
  test(
    'terminateContract refuses an UNKNOWN contract (null)',
    store.terminateContract('contract-does-not-exist', 'staff:test') === null
  );

  /* ── 5. the panel holds NO second source of truth ─────────────────────────── */
  test(
    'the panel keeps NO local draft state (no setExtraDrafts / useState<Contract[]>)',
    !panelSrc.includes('setExtraDrafts') && !panelSrc.includes('useState<Contract[]>')
  );
  test(
    'the panel writes every draft/closure through the canonical writers',
    panelSrc.includes('saveContractDraft') &&
      panelSrc.includes('renewContract') &&
      panelSrc.includes('terminateContract')
  );
  test(
    'the panel table is the canonical query alone (drafts included)',
    panelSrc.includes('rows={allContracts}') &&
      panelSrc.includes('const allContracts = contractsQuery.data?.data ?? [];')
  );

  console.log(
    failures === 0
      ? 'CONTRACT_CLOSING_VALIDATION_PASS'
      : `CONTRACT_CLOSING_VALIDATION_FAIL (${failures})`
  );
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;

