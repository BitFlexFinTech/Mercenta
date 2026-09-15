/**
 * §22–§25 (M13 Phase 9) — COMPANY / GOVERNMENT CONTROL CENTRE (Super Admin only).
 *
 * The founder's statutory position for Mercenta Partners Ltd in one place:
 *  - the registrar record (profile, officers, PSC, filing history, charges),
 *    every value labelled with the source it came from — a SIMULATED read is
 *    never presented as the real register;
 *  - the statutory deadlines with real day counts and next actions;
 *  - the confirmation statement workflow Detect → Prepare → Notify → Review →
 *    Approve → File → Verify, with the founder-approval gate enforced in the
 *    store (this component cannot bypass it);
 *  - the government credentials, held as MASKED references only;
 *  - HMRC, shown READY / NOT CONNECTED until VAT/MDT credentials exist.
 *
 * RBAC: mounted only inside SuperAdminPanel tabs; the tier is re-checked here.
 */
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Input } from '@/components/ui';
import { cn } from '@/utils/cn';
import { useApp } from '@/context/GlobalStateContext';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { isProviderSimulationSafe, resolveProviderMode } from '@/integrations/types';
import { companiesHouseConnectionCredentials } from '@/integrations/connections';
import {
  createCompaniesHouseClientForConnection,
  type ChCompanyRecord,
  type ChOfficer,
  type ChPersonWithSignificantControl,
  type ChFiling,
  type ChCharge,
} from '@/lib/compliance/index';
import {
  COMPANY_CENTRE_DISCLAIMER,
  COMPANY_REGISTRATION,
  COMPANIES_HOUSE_MANUAL_ACTIONS,
  CONFIRMATION_STATEMENT_WORKFLOW,
  GOVERNMENT_SECRET_KINDS,
  GOV_UK_MANUAL_ACTIONS,
  HMRC_READINESS,
  type GovernmentSecretKind,
} from '@/config/company';
import {
  advanceConfirmationStatement,
  approveConfirmationStatement,
  clearGovernmentSecret,
  companyAuditHistory,
  confirmConfirmationStatementFromRegister,
  deriveDueStatus,
  ensureCompanyStore,
  fileViaOfficialApi,
  getConfirmationStatement,
  getGovernmentSecret,
  getRegistrarSnapshot,
  markGovernmentSecretVerified,
  recordManualFiling,
  recordRegistrarReadFailure,
  recordRegistrarSnapshot,
  storeGovernmentSecret,
  type ConfirmationStatementState,
  type RegistrarSnapshot,
} from '@/data/companyStore';
import { ExternalLink, RefreshCw, ShieldCheck, Building2, KeyRound } from 'lucide-react';

const HOOK_EDGE_BASE = '/functions/v1/companies-house';

function SourceBadge({ source }: { source: string | null }) {
  const simulated = source === 'simulated_registrar';
  return (
    <Badge
      className={cn(
        'text-[10px]',
        simulated
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
      )}
    >
      {simulated ? 'SIMULATED REGISTRAR' : (source ?? 'not read')}
    </Badge>
  );
}

export function CompanyControlCentre() {
  const { session } = useApp();
  const { modes } = useIntegrations();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [referenceInput, setReferenceInput] = useState('');
  const [filedAtInput, setFiledAtInput] = useState('');
  const [secretDraft, setSecretDraft] = useState<Record<string, string>>({});
  const [snapshot, setSnapshot] = useState<RegistrarSnapshot>(() => {
    ensureCompanyStore();
    return getRegistrarSnapshot();
  });
  const [confirmation, setConfirmation] = useState<ConfirmationStatementState>(() => {
    ensureCompanyStore();
    return getConfirmationStatement();
  });
  const [auditCount, setAuditCount] = useState(() => companyAuditHistory().length);
  // Government-credential records live in a module-level store that mutations
  // change in place, so a revision counter is what tells React to re-render.
  const [, setRevision] = useState(0);

  const isSuperAdmin = session?.tier === 'super_admin';
  const chMode = resolveProviderMode(modes, 'companies_house');
  const chSimulationSafe = isProviderSimulationSafe(chMode);
  const chLive = chMode === 'live';
  const canReadRegister = chSimulationSafe || chLive;

  useEffect(() => {
    ensureCompanyStore();
  }, []);

  /** Re-read the store after every mutation so the UI cannot drift from it. */
  const refresh = useCallback(() => {
    setSnapshot(getRegistrarSnapshot());
    setConfirmation(getConfirmationStatement());
    setAuditCount(companyAuditHistory().length);
    setRevision((r) => r + 1);
  }, []);

  const csDue = deriveDueStatus(confirmation.nextDueDate);

  /**
   * Read the registrar. The factory decides mock vs live from the connection —
   * the panel never chooses, and the mode it reports back is what gets stored,
   * so a simulated read is always labelled as one.
   */
  const readRegister = async () => {
    setBusy(true);
    setMessage('');
    try {
      const { client, mode } = createCompaniesHouseClientForConnection(
        companiesHouseConnectionCredentials,
        HOOK_EDGE_BASE
      );
      const recordRes = await client.getCompanyRecord(COMPANY_REGISTRATION.companyNumber);
      if (!recordRes.ok || !recordRes.data) {
        recordRegistrarReadFailure({
          actorId,
          error: recordRes.error ?? 'The registrar returned no company record.',
        });
        setMessage(
          recordRes.error ??
            `No company record was returned for ${COMPANY_REGISTRATION.companyNumber}. Nothing has been assumed.`
        );
        refresh();
        return;
      }
      const [officersRes, pscRes, filingsRes, chargesRes] = await Promise.all([
        client.getOfficers(COMPANY_REGISTRATION.companyNumber),
        client.getPersonsWithSignificantControl(COMPANY_REGISTRATION.companyNumber),
        client.getFilingHistory(COMPANY_REGISTRATION.companyNumber),
        client.getCharges(COMPANY_REGISTRATION.companyNumber),
      ]);
      recordRegistrarSnapshot({
        mode: mode === 'real' ? 'live' : 'simulation',
        actorId,
        record: recordRes.data,
        officers: officersRes.data ?? [],
        psc: pscRes.data ?? [],
        filings: filingsRes.data ?? [],
        charges: chargesRes.data ?? [],
      });
      setMessage(
        mode === 'real'
          ? 'Registrar record read through the live Companies House connection.'
          : 'Simulated registrar record read — labelled as SIMULATED, not the real register.'
      );
    } catch (err) {
      const text = err instanceof Error ? err.message : 'The registrar read failed.';
      recordRegistrarReadFailure({ actorId, error: text });
      setMessage(text);
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const readError = snapshot.lastError;

  if (!isSuperAdmin) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Super Admin access required</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Company and government compliance controls are restricted to the Super Admin tier.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const record: ChCompanyRecord | null = snapshot.record;
  const officers: ChOfficer[] = snapshot.officers;
  const psc: ChPersonWithSignificantControl[] = snapshot.psc;
  const filings: ChFiling[] = snapshot.filings;
  const charges: ChCharge[] = snapshot.charges;
  const accountsDue = deriveDueStatus(snapshot.record?.nextAccountsDue ?? null);
  const actorId = 'super-admin:founder';

  return (
    <div className="space-y-4" data-testid="company-control-centre">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Company Control Centre — {COMPANY_REGISTRATION.legalName}
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1">{COMPANY_CENTRE_DISCLAIMER}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge
              className={cn(
                'text-[10px]',
                chLive
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                  : chSimulationSafe
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                    : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
              )}
            >
              Companies House: {String(chMode)}
            </Badge>
            <Button variant="tertiary" size="sm" className="text-xs" loading={busy} disabled={!canReadRegister} onClick={() => void readRegister()}>
              <RefreshCw className="w-3 h-3 mr-1" /> Read company record
            </Button>
          </div>
        </div>
        {!canReadRegister && (
          <p className="text-[10px] text-amber-300/90 mt-2" data-testid="company-read-blocked">
            Companies House resolves &lsquo;{String(chMode)}&rsquo; — not positively simulation and not live, so no read is
            attempted. Connect it in Integration Settings first.
          </p>
        )}
        {message && (
          <p className="text-[10px] text-emerald-300/90 mt-2" data-testid="company-read-message">
            {message}
          </p>
        )}
        {readError && (
          <p className="text-[10px] text-red-300/90 mt-2" data-testid="company-read-error">
            Last read error: {readError}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-4 mt-4 text-[11px]">
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-[10px] text-zinc-500">Company number</p>
            <p className="text-sm font-bold text-white font-mono">{COMPANY_REGISTRATION.companyNumber}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-[10px] text-zinc-500">Registrar status</p>
            <p className="text-sm font-bold text-white">{record?.status ?? COMPANY_REGISTRATION.registrarStatusLabel}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-[10px] text-zinc-500">Last read</p>
            <p className="text-sm font-bold text-white">
              {snapshot.readAt ? new Date(snapshot.readAt).toLocaleString() : 'never'}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-[10px] text-zinc-500">Audit entries</p>
            <p className="text-sm font-bold text-white">{auditCount}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5" title="Company record" subtitle="Every value is labelled with the source that produced it">
        <div className="grid gap-2 sm:grid-cols-2 text-[11px]" data-testid="company-record">
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-[10px] text-zinc-500">Legal name</p>
            <p className="text-xs text-white">{COMPANY_REGISTRATION.legalName}</p>
            <p className="text-[10px] text-zinc-600">founder_supplied</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-[10px] text-zinc-500">Jurisdiction</p>
            <p className="text-xs text-white">{COMPANY_REGISTRATION.jurisdiction}</p>
            <p className="text-[10px] text-zinc-600">founder_supplied</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-[10px] text-zinc-500">Incorporation date</p>
            <p className="text-xs text-white">{record?.incorporationDate ?? 'not read from the register'}</p>
            <SourceBadge source={snapshot.dataSource} />
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-[10px] text-zinc-500">Registered office</p>
            <p className="text-xs text-white">{record?.registeredOfficeAddress ?? 'not read from the register'}</p>
            <SourceBadge source={snapshot.dataSource} />
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2 sm:col-span-2">
            <p className="text-[10px] text-zinc-500">SIC codes</p>
            <p className="text-xs text-white font-mono">
              {record ? (record.sicCodes.length ? record.sicCodes.join(', ') : 'none returned') : 'not read from the register'}
            </p>
            <SourceBadge source={snapshot.dataSource} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5" title="Officers" subtitle="From the registrar read — nothing is invented">
          {officers.length === 0 ? (
            <p className="text-[11px] text-zinc-500" data-testid="company-officers-empty">
              {snapshot.readAt
                ? 'The registrar returned no officers for this company. Mercenta does not fill this in.'
                : 'Not read yet — read the company record.'}
            </p>
          ) : (
            <ul className="space-y-1" data-testid="company-officers">
              {officers.map((o) => (
                <li key={`${o.name}-${o.appointedOn ?? ''}`} className="text-[11px] text-zinc-300">
                  {o.name} · {o.role}
                  {o.appointedOn ? ` · appointed ${o.appointedOn}` : ''}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5" title="Persons with significant control" subtitle="Registrar data only">
          {psc.length === 0 ? (
            <p className="text-[11px] text-zinc-500" data-testid="company-psc-empty">
              {snapshot.readAt
                ? 'The registrar returned no PSC records. Mercenta does not fill this in.'
                : 'Not read yet — read the company record.'}
            </p>
          ) : (
            <ul className="space-y-1" data-testid="company-psc">
              {psc.map((p) => (
                <li key={p.name} className="text-[11px] text-zinc-300">
                  {p.name} — {p.naturesOfControl.join(', ') || p.kind}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5" title="Filing history" subtitle="Registrar data only">
          {filings.length === 0 ? (
            <p className="text-[11px] text-zinc-500" data-testid="company-filings-empty">
              {snapshot.readAt
                ? 'The registrar returned no filings. Mercenta never invents a filing.'
                : 'Not read yet — read the company record.'}
            </p>
          ) : (
            <ul className="space-y-1" data-testid="company-filings">
              {filings.map((f) => (
                <li key={f.transactionId} className="text-[11px] text-zinc-300">
                  {f.date} · {f.description}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5" title="Charges" subtitle="Registrar data only">
          {charges.length === 0 ? (
            <p className="text-[11px] text-zinc-500" data-testid="company-charges-empty">
              {record ? 'No charges on the register.' : 'Not read yet — read the company record.'}
            </p>
          ) : (
            <ul className="space-y-1" data-testid="company-charges">
              {charges.map((c) => (
                <li key={c.chargeId} className="text-[11px] text-zinc-300">
                  {c.createdAt} · {c.description ?? c.chargeId}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5" title="Company compliance deadlines" subtitle="Real day counts from the registrar-read dates">
        <div className="space-y-2" data-testid="company-deadlines">
          <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-ink-850 px-3 py-2" data-testid="company-deadline">
            <div>
              <p className="text-xs text-white">Confirmation statement</p>
              <p className="text-[10px] text-zinc-500">
                {confirmation.nextDueDate ?? 'No due date read from the register yet'} · {csDue.label}
              </p>
            </div>
            <Badge
              className={cn(
                'text-[10px]',
                csDue.state === 'overdue'
                  ? 'bg-red-500/15 text-red-300 border-red-500/20'
                  : csDue.state === 'due_soon'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                    : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
              )}
            >
              {csDue.state}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-ink-850 px-3 py-2" data-testid="company-deadline-accounts">
            <div>
              <p className="text-xs text-white">Annual accounts</p>
              <p className="text-[10px] text-zinc-500">
                {record?.nextAccountsDue ?? 'No accounts due date read from the register yet'} · {accountsDue.label}
              </p>
            </div>
            <Badge
              className={cn(
                'text-[10px]',
                accountsDue.state === 'overdue'
                  ? 'bg-red-500/15 text-red-300 border-red-500/20'
                  : accountsDue.state === 'due_soon'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                    : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
              )}
            >
              {accountsDue.state}
            </Badge>
          </div>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2">
          Reminder windows: {[90, 60, 30, 7, 0].join(' / ')} days before the due date. Accounts are prepared outside
          Mercenta and filed on the official service.
        </p>
      </Card>


      <Card
        className="p-5"
        title="Confirmation statement workflow"
        subtitle="Detect → Prepare → Notify → Review → Approve → File → Verify. Nothing is filed without the founder's approval."
      >
        <ol className="flex flex-wrap gap-2 mb-3" data-testid="company-workflow">
          {CONFIRMATION_STATEMENT_WORKFLOW.map((step, i) => {
            const currentIndex = CONFIRMATION_STATEMENT_WORKFLOW.findIndex((s) => s.id === confirmation.stage);
            const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'pending';
            return (
              <li
                key={step.id}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[10px]',
                  state === 'done'
                    ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
                    : state === 'current'
                      ? 'border-white/20 bg-white/10 text-white'
                      : 'border-zinc-700/60 bg-zinc-800/40 text-zinc-500'
                )}
                title={step.detail}
                data-testid={`company-workflow-${step.id}`}
                data-state={state}
              >
                {step.label}
              </li>
            );
          })}
        </ol>
        <div className="space-y-1 text-[11px] text-zinc-400">
          <p>
            Stage: <span className="text-white">{confirmation.stage}</span> · Due date:{' '}
            <span className="text-white">{confirmation.nextDueDate ?? 'not read yet'}</span> · Source:{' '}
            {confirmation.dueDateSource}
          </p>
          <p>
            Founder approval:{' '}
            <span className="text-white">
              {confirmation.founderApprovedAt ? `${confirmation.approvedBy} · ${confirmation.founderApprovedAt}` : 'not given'}
            </span>
          </p>
          {confirmation.recordedReference && (
            <p>
              Recorded filing reference: <span className="font-mono text-white">{confirmation.recordedReference}</span> ·
              method: {confirmation.filingMethod} · recorded {confirmation.recordedAt}
            </p>
          )}
          {confirmation.registerConfirmedAt && (
            <p className="text-emerald-300/90">
              Verified against the register on {confirmation.registerConfirmedAt}.
            </p>
          )}
        </div>
        <input type="hidden" data-testid="company-workflow-stage" value={confirmation.stage} readOnly />
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            variant="tertiary"
            size="sm"
            className="text-xs"
            onClick={() => {
              const res = advanceConfirmationStatement({ stage: 'review', actorId });
              setMessage(res.ok ? 'Moved to REVIEW.' : res.error);
              refresh();
            }}
          >
            Review
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="text-xs"
            data-state={confirmation.founderApprovedAt ? 'approved' : 'pending'}
            onClick={() => {
              const res = approveConfirmationStatement({ actorId });
              setMessage(res.ok ? 'Approved by the founder. The filing step is now unlocked.' : res.error);
              refresh();
            }}
          >
            Approve
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            className="text-xs"
            onClick={() => {
              const res = fileViaOfficialApi({ actorId });
              setMessage(res.ok ? 'Submitted.' : res.error);
              refresh();
            }}
          >
            File via connected service
          </Button>
        </div>
        <p className="text-[10px] text-amber-300/80 mt-2" data-testid="company-filing-notice">
          Mercenta holds no official electronic-filing channel for Companies House, so nothing is submitted from here.
          File on the official service, then record the reference below.
        </p>
        <div className="grid gap-2 sm:grid-cols-3 mt-3 items-end">
          <Input
            label="Companies House filing reference"
            value={referenceInput}
            onChange={(e) => setReferenceInput(e.target.value)}
            placeholder="e.g. the reference shown after filing"
          />
          <Input
            label="Date filed"
            type="date"
            value={filedAtInput}
            onChange={(e) => setFiledAtInput(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={() => {
                const res = recordManualFiling({ reference: referenceInput, filedAt: filedAtInput, actorId });
                setMessage(res.ok ? 'Filing recorded. It stays unverified until the register is re-read.' : res.error);
                if (res.ok) setReferenceInput('');
                refresh();
              }}
            >
              Record filing reference
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              className="text-xs"
              onClick={() => {
                const res = confirmConfirmationStatementFromRegister({ actorId });
                setMessage(res.ok ? 'Filing verified against the register.' : res.error);
                refresh();
              }}
            >
              Verify on the register
            </Button>
          </div>
        </div>
        <a
          className="inline-flex items-center gap-1 text-[10px] text-sky-300/90 mt-2"
          href={COMPANIES_HOUSE_MANUAL_ACTIONS.filing}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="w-3 h-3" /> Open the official Companies House filing service
        </a>
      </Card>


      <Card
        className="p-5"
        title="Government credentials"
        subtitle="Held as masked references only. Mercenta never displays, logs, exports or reports the value."
      >
        <div className="space-y-3" data-testid="gov-credentials">
          {GOVERNMENT_SECRET_KINDS.map((spec) => {
            const rec = getGovernmentSecret(spec.id as GovernmentSecretKind);
            return (
              <div key={spec.id} className="rounded-lg border border-white/[0.06] bg-ink-850 px-3 py-2" data-testid={`gov-credential-${spec.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-white flex items-center gap-1">
                      <KeyRound className="w-3 h-3" /> {spec.label}
                    </p>
                    <p className="text-[10px] text-zinc-500">{spec.purpose}</p>
                  </div>
                  <Badge
                    className={cn(
                      'text-[10px]',
                      rec.secretRef
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                        : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                    )}
                  >
                    {rec.secretRef ? `stored ${rec.masked}` : 'not stored'}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-end gap-2 mt-2">
                  <Input
                    label={`Enter ${spec.label}`}
                    type="password"
                    value={secretDraft[spec.id] ?? ''}
                    onChange={(e) => setSecretDraft((d) => ({ ...d, [spec.id]: e.target.value }))}
                    placeholder={spec.enterAt}
                    className="min-w-[220px]"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const res = storeGovernmentSecret({
                        kind: spec.id as GovernmentSecretKind,
                        value: secretDraft[spec.id] ?? '',
                        actorId,
                      });
                      setMessage(res.ok ? `${spec.label} stored as ${res.value.masked} (masked reference only).` : res.error);
                      if (res.ok) setSecretDraft((d) => ({ ...d, [spec.id]: '' }));
                      refresh();
                    }}
                  >
                    Store as masked reference
                  </Button>
                  <Button
                    variant="tertiary"
                    size="sm"
                    className="text-xs"
                    disabled={!rec.secretRef}
                    onClick={() => {
                      const res = markGovernmentSecretVerified({ kind: spec.id as GovernmentSecretKind, actorId });
                      setMessage(res.ok ? `${spec.label} confirmed working.` : res.error);
                      refresh();
                    }}
                  >
                    Confirm working
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    disabled={!rec.secretRef}
                    onClick={() => {
                      const res = clearGovernmentSecret({ kind: spec.id as GovernmentSecretKind, actorId });
                      setMessage(res.ok ? `${spec.label} reference removed.` : res.error);
                      refresh();
                    }}
                  >
                    Remove
                  </Button>
                  <a
                    className="inline-flex items-center gap-1 text-[10px] text-sky-300/90"
                    href={spec.manualActionUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="w-3 h-3" /> {spec.enterAt}
                  </a>
                </div>
                {rec.verifiedAt && <p className="text-[10px] text-emerald-300/80 mt-1">Confirmed {rec.verifiedAt}</p>}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-600 mt-2">
          GOV.UK does not provide a supported API for the company actions Mercenta needs, so the GOV.UK item is a
          credential reference plus a manual-action link — there is no invented integration.
          <a className="text-sky-300/90 ml-1" href={GOV_UK_MANUAL_ACTIONS.oneLoginManage} target="_blank" rel="noreferrer">
            Manage GOV.UK One Login
          </a>
        </p>
      </Card>

      <Card className="p-5" title="HMRC" subtitle="Not connected — shown truthfully, never as live">
        <div className="flex items-center justify-between gap-3" data-testid="company-hmrc">
          <div>
            <p className="text-xs text-white">HMRC — Making Tax Digital</p>
            <p className="text-[10px] text-zinc-500">{HMRC_READINESS.reason}</p>
            <p className="text-[10px] text-zinc-600">Blocker: {HMRC_READINESS.blocker}</p>
          </div>
          <Badge className="text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/20">
            {HMRC_READINESS.state === 'ready_not_connected' ? 'READY / NOT CONNECTED' : String(HMRC_READINESS.state)}
          </Badge>
        </div>
      </Card>
    </div>
  );
}

