/**
 * §Phase 3 — Simulation Control Centre.
 *
 * Super Admin / developer-only control surface for the MERCENTA simulation
 * environment. It drives the EXISTING scenario engine
 * (src/lib/simulation/scenarioEngine.ts) — it never defines a second
 * simulation architecture.
 *
 * SAFETY (defense in depth):
 *   1. Access: AdminShell already mounts SuperAdminPanel only for the
 *      super_admin tier. This component additionally enforces the SAME tier
 *      at its own boundary (existing RBAC model — no parallel permission
 *      system).
 *   2. Execution: every run passes a `getMode` resolved from the Integrations
 *      Hub's live mode map into `runScenario`, which runs the engine's own
 *      `assertSimulationOnly` gate. If a required provider is LIVE, the engine
 *      refuses (`status: 'safety_refused'`) — never warns-and-continues.
 *   3. Boundary: the panel independently inspects the required-provider modes
 *      before allowing a run and disables/refuses when any is LIVE, so a
 *      refused scenario cannot even be started.
 *   4. No live traffic: this component makes no network calls; scenarios
 *      route through mock seams only.
 *
 * RESET: only the verified, genuinely-safe shared seams are exposed
 * (`resetMockAmazonState`, `resetEvents`). The control is explicitly labelled
 * PARTIAL — it does not remove scenario-created demo-store records.
 */

import { useEffect, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { isProviderSimulationSafe, resolveProviderMode } from '@/integrations/types';
/**
 * §P1 — THE ONE SWITCH. The single environment owner. This surface is the ONE
 * obvious place the platform's demo/live switch is flipped.
 */
import {
  buildDefaultEnvironmentMode,
  environmentMode,
  isEnvironmentOverridden,
  resetEnvironmentMode,
  setEnvironmentMode,
  subscribeEnvironment,
  type EnvironmentMode,
} from '@/config/environment';
import type { IntegrationId } from '@/integrations/types';
import { Badge, Button, Card, Input } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  listScenarios,
  runScenario,
  runAllScenarios,
  type ScenarioId,
  type ScenarioResult,
  type ScenarioRunContext,
} from '@/lib/simulation/scenarioEngine';
import { queryEvents, resetEvents } from '@/lib/events/eventFeed';
import { InvestorDemoPanel } from './InvestorDemoPanel';
import { resetMockAmazonState } from '@/lib/spapi/mockClient';
import { resetMockDhlState } from '@/lib/dhl/mockClient';
import { resetMockCompaniesHouseState, resetMockHmrcState } from '@/lib/compliance/index';
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Play,
  Power,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

interface ScenarioMeta {
  name: string;
  purpose: string;
  simulates: string;
  /** Provider ids required by the engine gate (see scenarioEngine.ts). */
  requiredProviders: string[];
}

/** Static purpose metadata — NEVER overrides engine behavior. */
const SCENARIO_META: Record<ScenarioId, ScenarioMeta> = {
  NORMAL_PO: {
    name: 'Normal Purchase Order',
    purpose: 'Full PO lifecycle — receive, acknowledge, ship, deliver, reconcile.',
    simulates: 'A vendor purchase order with no exceptions: all lines accepted, ASN filed, receipt matches confirmed quantities.',
    requiredProviders: ['amazon_sp_api', 'dhl'],
  },
  PARTIAL_PO: {
    name: 'Partial Purchase Order',
    purpose: 'Partial acceptance with a backordered line and a short-ship deduction.',
    simulates: 'A PO where one line is backordered; the ASN short-ships, automatically raising a shortage-claim deduction.',
    requiredProviders: ['amazon_sp_api'],
  },
  DELAYED_DELIVERY: {
    name: 'Delayed Delivery',
    purpose: 'A shipment that is delayed during international forwarding.',
    simulates: 'A confirmed PO whose shipment is flagged delayed at UK customs — an exception state with a notification.',
    requiredProviders: ['dhl'],
  },
  FINANCIAL_EXCEPTION: {
    name: 'Financial Exception',
    purpose: 'Deduction opened, disputed, and resolved after investigation.',
    simulates: 'A shortage chargeback that the brand disputes and wins — a full financial-exception lifecycle.',
    requiredProviders: ['stripe', 'xero'],
  },
  CASE: {
    name: 'Support Case',
    purpose: 'A helpdesk case opened, assigned, and resolved.',
    simulates: 'A logistics labelling case: ticket created, assigned to staff, resolved by the real ticket store.',
    requiredProviders: [],
  },
  PRODUCT_FAILURE: {
    name: 'Product Validation Failure',
    purpose: 'A product failing image validation, corrected, then submitted.',
    simulates: 'A product whose main image fails validation, is re-validated after correction, then submitted to the retail pipeline.',
    requiredProviders: ['amazon_sp_api'],
  },
  INTEGRATION_FAILURE: {
    name: 'Integration Failure / Retry',
    purpose: 'Provider failure with retry and eventual recovery (or gate-held outcome).',
    simulates: 'A catalog submission polled through the Mock SP-API seam — failure/retry semantics, honestly including gate-held outcomes.',
    requiredProviders: ['amazon_sp_api', 'dhl', 'stripe'],
  },
  SHIPMENT_PROGRESSION: {
    name: 'Shipment Progression (DHL)',
    purpose: 'A DHL consignment walked milestone-by-milestone through the carrier seam.',
    simulates: 'PO received → acknowledged → DHL waybill booked → pickup → in-transit → customs → delivered, with deterministic delay/exception handling and per-milestone audit + event records.',
    requiredProviders: ['dhl'],
  },
  COMPLIANCE_VERIFICATION: {
    name: 'Compliance Verification (Companies House + HMRC)',
    purpose: 'Company verification and HMRC VAT filing through the government adapters.',
    simulates: 'Brand company verified at the registrar (with simulated rate-limit retry), VAT status read, VAT return filed — rejected returns are retried and accepted. Full audit + event trail.',
    requiredProviders: ['companies_house', 'hmrc'],
  },
};

/**
 * §Phase 4 — authoritative boundary check is defined via the shared resolver
 * (isProviderSimulationSafe / resolveProviderMode) in the scenario panel.
 */

/**
 * §P1 — THE ONE SWITCH (the environment owner, made operable).
 *
 * ONE obvious control flips the WHOLE platform between `demo` (seeded data,
 * every external provider simulated, no credential required) and `live` (real
 * data only — NO seed fallback, and an unconfigured provider is UNAVAILABLE,
 * never simulated). It writes to the single owner (`src/config/environment.ts`);
 * nothing else in the platform decides demo-vs-live for itself.
 */
function EnvironmentSwitch() {
  const [mode, setMode] = useState<EnvironmentMode>(environmentMode);
  useEffect(() => subscribeEnvironment(() => setMode(environmentMode())), []);

  const isDemo = mode === 'demo';
  const defaultMode = buildDefaultEnvironmentMode();

  return (
    <Card className="p-4" data-testid="environment-switch">
      <div data-environment-banner={mode} className="mt-3 rounded-ds-md border border-white/[0.08] bg-white/[0.03] p-2 text-ds-label text-zinc-300 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>{isDemo ? 'DEMO MODE: you are viewing demo data. No real data or API calls.' : 'LIVE MODE: some integrations are not yet connected. Connect them in Settings.'}</span>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap" data-environment-switch={mode}>
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Power className="w-4 h-4 text-brass-300" /> Platform environment
          </h3>
          <p className="text-ds-label text-zinc-500 mt-0.5 max-w-2xl leading-relaxed">
            {isDemo
              ? 'Demo — seeded data, every external provider simulated, no credential required. This is the platform default.'
              : 'Live — real data only. There is no seed fallback (an empty platform is correct), and a provider with no configured credentials is UNAVAILABLE, never simulated.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isEnvironmentOverridden() && (
            <span data-environment-override className="text-ds-micro text-zinc-500">
              override · default {defaultMode}
            </span>
          )}
          <Badge
            className={cn(
              'text-ds-micro uppercase tracking-wide border',
              isDemo
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
            )}
          >
            {isDemo ? 'Demo' : 'Live'}
          </Badge>
          {isEnvironmentOverridden() && (
            <Button variant="ghost" className="text-xs" onClick={() => resetEnvironmentMode()}>
              Reset to default ({defaultMode})
            </Button>
          )}
          <Button variant="secondary" className="text-xs" onClick={() => setEnvironmentMode(isDemo ? 'live' : 'demo')}>
            {isDemo ? 'Switch to Live' : 'Switch to Demo'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function SimulationControl() {
  const { session } = useApp();
  const { modes } = useIntegrations();

  const [seed, setSeed] = useState<number>(1);
  const [running, setRunning] = useState<ScenarioId | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [results, setResults] = useState<Partial<Record<ScenarioId, ScenarioResult & { eventsEmitted: number }>>>({});
  const [lastResetAt, setLastResetAt] = useState<string | null>(null);

  const isSuperAdmin = session?.tier === 'super_admin';

  /**
   * §Phase 4 — authoritative boundary check using the shared resolver.
   * Safe ONLY when every required provider positively resolves `simulation`.
   */
  function scenarioIsSafe(id: ScenarioId): { safe: boolean; unsafeProviders: string[] } {
    const unsafeProviders = SCENARIO_META[id].requiredProviders.filter((pid) => {
      const mode = resolveProviderMode(modes, pid);
      return !isProviderSimulationSafe(mode);
    });
    return { safe: unsafeProviders.length === 0, unsafeProviders };
  }

  async function runOne(id: ScenarioId) {
    if (running || runningAll) return;
    const { safe } = scenarioIsSafe(id);
    if (!safe) return; // boundary refusal — Run disabled below, engine gate is backstop
    setRunning(id);
    const ctx: ScenarioRunContext = {
      seed,
      getMode: (pid: string) => resolveProviderMode(modes, pid),
    };
    try {
      const before = queryEvents().length;
      const res = await runScenario(id, ctx);
      const eventsEmitted = queryEvents().length - before;
      setResults((prev) => ({ ...prev, [id]: { ...res, eventsEmitted } }));
    } finally {
      setRunning(null);
    }
  }

  async function runAll() {
    if (running || runningAll) return;
    setRunningAll(true);
    const ctx: ScenarioRunContext = {
      seed,
      getMode: (pid: string) => resolveProviderMode(modes, pid),
    };
    try {
      const before = queryEvents().length;
      const all = await runAllScenarios(ctx);
      const eventsEmitted = queryEvents().length - before;
      setResults((prev) => {
        const next = { ...prev };
        for (const id of listScenarios()) {
          next[id] = { ...all[id], eventsEmitted };
        }
        return next;
      });
    } finally {
      setRunningAll(false);
    }
  }

  /** PARTIAL shared reset — only the verified safe seams. */
  function resetSharedState() {
    resetMockAmazonState();
    resetMockDhlState();
    resetMockCompaniesHouseState();
    resetMockHmrcState();
    resetEvents();
    setResults({});
    setLastResetAt(new Date().toISOString());
  }

  if (!isSuperAdmin) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-ds-md bg-red-500/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Super Admin access required</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Simulation controls are restricted to the Super Admin tier. This view is not authorized for your session.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-brass-300" /> Simulation Control Centre
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Deterministic, simulation-only execution of the MERCENTA scenario engine. Never touches a live provider.
          </p>
        </div>
        <Badge className="text-ds-micro bg-amber-500/15 text-amber-300 border-amber-500/20 uppercase tracking-wide">
          Simulation only
        </Badge>
      </div>

      {/* §P1 — THE ONE SWITCH: the platform demo/live environment, in one place. */}
      <EnvironmentSwitch />

      {/* §Phase E2E — the investor-demo orchestration (the SAME simulation
          architecture; it drives the canonical domain end-to-end). */}
      <InvestorDemoPanel />

      {/* Run controls */}
      <Card className="p-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="w-40">
            <Input
              label="Deterministic seed"
              type="number"
              value={String(seed)}
              onChange={(e) => setSeed(Number(e.target.value) || 1)}
              className="text-xs"
            />
          </div>
          <Button onClick={() => void runAll()} disabled={running !== null || runningAll} className="text-xs">
            {runningAll ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Running all…</> : <><Play className="w-3.5 h-3.5 mr-1" /> Run all scenarios</>}
          </Button>
          <Button variant="ghost" onClick={resetSharedState} className="text-xs">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset shared simulation state
          </Button>
        </div>
        <p className="text-ds-label text-zinc-600 mt-2 leading-relaxed">
          Same seed ⇒ same record IDs (runId, PO, shipment, audit rows) — deterministic and reproducible.
          Reset is <span className="text-zinc-400">partial</span>: clears the Mock SP-API submission state and event feed only;
          it does not remove scenario-created PO/shipment/deduction/ticket records from the demo store.
          {lastResetAt && <span className="block text-emerald-400 mt-1">Last reset: {new Date(lastResetAt).toLocaleString()}</span>}
        </p>
      </Card>
{/* Scenario list */}
      <div className="space-y-3">
        {listScenarios().map((id) => {
          const meta = SCENARIO_META[id];
          const { safe, unsafeProviders } = scenarioIsSafe(id);
          const result = results[id];
          return (
            <Card key={id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-white">{meta.name}</h4>
                    <Badge className="text-ds-micro uppercase tracking-wide bg-zinc-500/15 text-zinc-400 border-zinc-500/20">{id}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{meta.purpose}</p>
                  <p className="text-ds-label text-zinc-600 mt-1 leading-relaxed max-w-2xl">
                    <span className="text-zinc-400">Simulates:</span> {meta.simulates}
                  </p>
                </div>
                <Button
                  onClick={() => void runOne(id)}
                  disabled={running !== null || runningAll || !safe}
                  className={cn('text-xs flex-shrink-0', !safe && 'opacity-50')}
                >
                  {running === id ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Running…</> : <><Play className="w-3.5 h-3.5 mr-1" /> Run</>}
                </Button>
              </div>

              {/* Safety status */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {safe ? (
                  <Badge className="text-ds-micro bg-emerald-500/15 text-emerald-300 border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Simulation-safe
                  </Badge>
                ) : (
                  <Badge className="text-ds-micro bg-red-500/15 text-red-300 border-red-500/20">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Refused — provider not simulation-safe: {unsafeProviders.join(', ')}
                  </Badge>
                )}
              </div>

              {/* Result */}
              {result && <ScenarioResultView result={result} />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
/** Structured result view — operational fields, never a raw JSON dump. */
function ScenarioResultView({ result }: { result: ScenarioResult & { eventsEmitted: number } }) {
  const statusCls =
    result.status === 'ok'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
      : result.status === 'safety_refused'
      ? 'bg-red-500/15 text-red-300 border-red-500/20'
      : 'bg-amber-500/15 text-amber-300 border-amber-500/20';
  const statusLabel =
    result.status === 'ok' ? 'Succeeded'
    : result.status === 'safety_refused' ? 'Safety refused' : 'Error';

  return (
    <div className="mt-3 bg-white/[0.02] border border-white/[0.05] rounded-ds-md p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge className={cn('text-ds-micro border', statusCls)}>
            {result.status === 'ok' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
            {statusLabel}
          </Badge>
          <span className="text-ds-label text-zinc-500">runId: <span className="font-mono text-zinc-400">{result.runId}</span></span>
        </div>
        <div className="text-ds-label text-zinc-500">
          {result.auditIds.length} audit row{result.auditIds.length === 1 ? '' : 's'} · {result.eventsEmitted} event{result.eventsEmitted === 1 ? '' : 's'} · {result.steps.length} step{result.steps.length === 1 ? '' : 's'}
        </div>
      </div>

      {result.safetyReason && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-ds-sm px-2.5 py-1.5 text-ds-label text-red-300">
          {result.safetyReason}
        </div>
      )}

      {result.error && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-ds-sm px-2.5 py-1.5 text-ds-label text-amber-200">
          {result.error}
        </div>
      )}

      <CreatedEntities result={result} />

      {result.steps.length > 0 && (
        <div className="space-y-1">
          <div className="text-ds-micro font-semibold text-zinc-500 uppercase tracking-wide">State transitions</div>
          <ol className="space-y-1">
            {result.steps.map((s) => (
              <li key={s.step} className="flex items-center gap-2 text-ds-label">
                <span className="font-mono text-zinc-600 w-5 flex-shrink-0">{s.step}.</span>
                <span className="text-zinc-300">{s.action}</span>
                {s.from && s.to && (
                  <span className="text-zinc-500">
                    <span className="font-mono text-zinc-500">{s.from}</span> → <span className="font-mono text-zinc-400">{s.to}</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/** Structured summary of created entities (never a raw object dump). */
function CreatedEntities({ result }: { result: ScenarioResult }) {
  const c = result.created;
  const items: { label: string; value?: string }[] = [];
  if (c.purchaseOrder) items.push({ label: 'Purchase order', value: c.purchaseOrder });
  if (c.shipmentId) items.push({ label: 'Shipment', value: c.shipmentId });
  if (c.ticketId) items.push({ label: 'Case / ticket', value: c.ticketId });
  if (c.productSku) items.push({ label: 'Product SKU', value: c.productSku });
  if (c.submissionId) items.push({ label: 'Catalog submission', value: c.submissionId });
  if (c.deductions.length) items.push({ label: 'Deductions', value: c.deductions.join(', ') });

  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1">
      {items.map((it) => (
        <div key={it.label} className="text-ds-label">
          <span className="text-zinc-500">{it.label}: </span>
          <span className="font-mono text-zinc-300">{it.value}</span>
        </div>
      ))}
    </div>
  );
}
