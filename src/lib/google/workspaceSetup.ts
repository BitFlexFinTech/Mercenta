/**
 * §21 (M13 Phase 8) — Google Drive/Workspace setup runner.
 *
 * Executes the declarative plan in `src/config/google.ts` through whichever
 * client the factory returned, in dependency order (a child is never attempted
 * before its parent exists), and reports EVERY step's real outcome. A failed
 * step is retried once — and if it still fails it is reported as FAILED, never
 * silently skipped. When the mock client is in use the results are labelled
 * `simulated: true`, so the wizard can never present a simulated Drive as real.
 */
import type { GoogleWorkspacePlanItem } from '@/config/google';
import type { GoogleItem } from './googleClient';

export interface GoogleSetupStepResult {
  itemId: string;
  kind: GoogleWorkspacePlanItem['kind'];
  name: string;
  status: 'created' | 'failed' | 'skipped';
  url?: string;
  error?: string;
  simulated: boolean;
  attempts: number;
  /** The parent item id resolved at run time (null for the root). */
  parentId: string | null;
  capabilityTest: boolean;
}

/** Minimal structural client type — the real and mock clients both satisfy it. */
export interface GoogleSetupClient {
  createFolder(input: { name: string; parentId?: string | null }): Promise<{ ok: boolean; item?: GoogleItem; error?: string; simulated?: boolean }>;
  createSheet(input: { name: string; parentId?: string | null; tabs?: string[] }): Promise<{ ok: boolean; item?: GoogleItem; error?: string; simulated?: boolean }>;
  createDoc(input: { name: string; parentId?: string | null; body?: string }): Promise<{ ok: boolean; item?: GoogleItem; error?: string; simulated?: boolean }>;
  createSlides(input: { name: string; parentId?: string | null }): Promise<{ ok: boolean; item?: GoogleItem; error?: string; simulated?: boolean }>;
  createCalendarEvent(input: { name: string; date?: string }): Promise<{ ok: boolean; item?: GoogleItem; error?: string; simulated?: boolean }>;
}

async function create(
  client: GoogleSetupClient,
  plan: GoogleWorkspacePlanItem,
  parentId: string | null
): Promise<{ ok: boolean; item?: GoogleItem; error?: string; simulated?: boolean }> {
  switch (plan.kind) {
    case 'folder':
      return client.createFolder({ name: plan.name, parentId });
    case 'sheet':
      return client.createSheet({ name: plan.name, parentId, tabs: plan.tabs });
    case 'doc':
      return client.createDoc({ name: plan.name, parentId });
    case 'slides':
      return client.createSlides({ name: plan.name, parentId });
    case 'calendar_event':
      return client.createCalendarEvent({ name: plan.name });
  }
}

/**
 * Run the whole plan. Returns one result per plan item, in plan order, and never
 * throws for an individual provider failure.
 */
export async function runGoogleWorkspaceSetup(input: {
  client: GoogleSetupClient;
  plan: GoogleWorkspacePlanItem[];
  /** Used for the calendar capability test date. */
  today?: string;
}): Promise<GoogleSetupStepResult[]> {
  const results: GoogleSetupStepResult[] = [];
  const resolved = new Map<string, string>();

  for (const plan of input.plan) {
    let parentId: string | null = null;
    if (plan.parent) {
      const parent = resolved.get(plan.parent);
      if (!parent) {
        results.push({
          itemId: plan.id,
          kind: plan.kind,
          name: plan.name,
          status: 'skipped',
          error: `Parent "${plan.parent}" was not created, so this item was skipped.`,
          simulated: false,
          attempts: 0,
          parentId: null,
          capabilityTest: Boolean(plan.capabilityTest),
        });
        continue;
      }
      parentId = parent;
    }

    let attempts = 0;
    let outcome = await (async () => {
      attempts += 1;
      return create(input.client, plan, parentId);
    })();
    if (!outcome.ok) {
      // One retry — the simulated provider's transient failure recovers here,
      // exactly like the real API's rate-limit retry.
      attempts += 1;
      outcome = await create(input.client, plan, parentId);
    }

    if (outcome.ok && outcome.item) {
      resolved.set(plan.id, outcome.item.id);
      results.push({
        itemId: plan.id,
        kind: plan.kind,
        name: plan.name,
        status: 'created',
        url: outcome.item.url,
        simulated: Boolean(outcome.simulated),
        attempts,
        parentId,
        capabilityTest: Boolean(plan.capabilityTest),
      });
    } else {
      results.push({
        itemId: plan.id,
        kind: plan.kind,
        name: plan.name,
        status: 'failed',
        error: outcome.error ?? 'The Google API call failed.',
        simulated: Boolean(outcome.simulated),
        attempts,
        parentId,
        capabilityTest: Boolean(plan.capabilityTest),
      });
    }
  }
  return results;
}

/** Summary of a run — the counts the wizard reports. */
export function summariseGoogleRun(steps: GoogleSetupStepResult[]): {
  total: number;
  created: number;
  failed: number;
  skipped: number;
  simulated: boolean;
  capabilityTestsPassed: number;
  capabilityTestsTotal: number;
} {
  const caps = steps.filter((s) => s.capabilityTest);
  return {
    total: steps.length,
    created: steps.filter((s) => s.status === 'created').length,
    failed: steps.filter((s) => s.status === 'failed').length,
    skipped: steps.filter((s) => s.status === 'skipped').length,
    simulated: steps.some((s) => s.simulated),
    capabilityTestsPassed: caps.filter((s) => s.status === 'created').length,
    capabilityTestsTotal: caps.length,
  };
}
