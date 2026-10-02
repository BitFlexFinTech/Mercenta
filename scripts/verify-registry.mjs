#!/usr/bin/env node
/**
 * Requirements Registry Validator with reachability check.
 *
 * Mechanically checks:
 * - File/line references confirm the file still exists.
 * - e2e test references confirm the test file exists.
 * - **REACHABILITY**: component files must be referenced in a nav array
 *   (ADMIN_NAV/BRAND_NAV/CARRIER_NAV) AND have a render condition in App.tsx.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REGISTRY_PATH = resolve(ROOT, 'requirements-registry.json');
const APP_TSX_PATH = resolve(ROOT, 'src/App.tsx');

let registry;
try {
  const raw = readFileSync(REGISTRY_PATH, 'utf-8');
  registry = JSON.parse(raw);
} catch (err) {
  console.error('Failed to load registry:', err.message);
  process.exit(1);
}

const entries = registry.entries || [];
console.log('\nRequirements Registry:', entries.length, 'entries\n');

// ── Build nav + render-condition lookup from App.tsx
let navLookup = new Set();
let navIdToLabel = {};
let componentNavMap = {};
let renderConditions = new Set();
function buildLookup(appTsx) {
  const navRegex = /(ADMIN_NAV|BRAND_NAV|CARRIER_NAV)\s*=\s*\[([\s\S]*?)\];/g;
  let match;
  while ((match = navRegex.exec(appTsx)) !== null) {
    const content = match[2];
    const itemRegex = /\{\s*id:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'/g;
    let item;
    while ((item = itemRegex.exec(content)) !== null) {
      const id = item[1], label = item[2];
      navLookup.add(id);
      navIdToLabel[id] = label;
      const pascal = id.replace(/_([a-z])/g, (_, c) => c.toUpperCase()).replace(/^([a-z])/, (_, c) => c.toUpperCase());
      for (const suffix of ['AdminPanel', 'Panel', 'Dashboard', 'Hub', 'Manager', 'List']) {
        componentNavMap[(pascal + suffix).toLowerCase()] = id;
      }
      componentNavMap[pascal.toLowerCase()] = id;
    }
  }

  const condRegex = /(adminView|brandView|carrierView)\s*===\s*'([^']+)'\s*&&/g;
  let cond;
  while ((cond = condRegex.exec(appTsx)) !== null) {
    renderConditions.add(cond[2]);
  }
}

try {
  const appTsx = readFileSync(APP_TSX_PATH, 'utf-8');
  buildLookup(appTsx);
} catch (err) {
  console.warn('Could not read App.tsx for reachability:', err.message);
}

function resolveFilePath(ref) {
  let path = ref
    .replace(/ lines? \d+(-\d+)?/g, '').replace(/:\d+(-\d+)?/g, '')
    .replace(/\(.*?\)/g, '').split(';')[0].split(',')[0].trim();
  const prefixed = (p) => {
    if (p.startsWith('/')) return p;
    if (p.startsWith('src/') || p.startsWith('supabase/') || p.startsWith('e2e/') || p.startsWith('scripts/')) return p;
    if (p.startsWith('functions/')) return 'supabase/' + p;
    if (p.match(/^[\w-]+\.(tsx|ts|mjs|sql|json)$/)) {
      if (p.endsWith('.json')) return p;
      return 'src/' + p;
    }
    return p;
  };
  path = prefixed(path);
  if (path.startsWith('src/') || path.startsWith('supabase/') || path.startsWith('e2e/') || path.startsWith('scripts/')) {
    return resolve(ROOT, path);
  }
  if (path.includes('.tsx') || path.includes('.ts') || path.includes('.mjs') || path.endsWith('.json')) {
    return resolve(ROOT, path);
  }
  return null;
}

function checkReachability(componentPath) {
  if (!componentPath || !componentPath.includes('/components/')) return null;
  const basename = componentPath.split('/').pop().replace(/\.tsx$/, '').toLowerCase();
  const nameNoSuffix = basename.replace(/adminpanel$|panel$|dashboard$|hub$|manager$/i, '');

  let navId = componentNavMap[basename] || componentNavMap[nameNoSuffix];
  if (!navId) {
    for (const suffix of ['adminpanel', 'panel', 'dashboard', 'hub', 'manager']) {
      if (basename.endsWith(suffix)) {
        const stem = basename.slice(0, -suffix.length);
        navId = componentNavMap[stem];
        if (navId) break;
      }
    }
  }

  if (!navId) {
    for (const id of navLookup) {
      const idLower = id.replace(/_/g, '').toLowerCase();
      if (basename.includes(idLower) || idLower.includes(basename)) {
        navId = id;
        break;
      }
    }
  }

  if (!navId) {
    return { ok: false, msg: 'Component not mapped to any navId in ADMIN_NAV/BRAND_NAV/CARRIER_NAV' };
  }
  if (!navLookup.has(navId)) {
    return { ok: false, msg: "Derived navId '" + navId + "' not found in any nav array" };
  }
  if (!renderConditions.has(navId)) {
    return { ok: false, msg: "NavId '" + navId + "' exists in nav but has no render condition in App.tsx" };
  }
  return { ok: true, msg: "Reachable via navId '" + navId + "' (" + (navIdToLabel[navId] || navId) + ")" };
}
// ── Audit each entry ──────────────────────────────────────────────────
let verified = 0, needsManual = 0, totalIssues = 0, reachabilityFlags = 0;

for (const entry of entries) {
  const { id, description, status, evidence } = entry;
  const issues = [];

  if (!evidence) {
    if (status !== 'not_started') {
      issues.push('No evidence pointer but status is "' + status + '"');
      totalIssues++;
      needsManual++;
    }
    continue;
  }

  // built_and_tested requires e2e test reference
  if (status === 'built_and_tested') {
    const e2eMatch = evidence.match(/e2e\/[\w.-]+\.spec\.ts/g);
    if (!e2eMatch) {
      issues.push('STATUS VIOLATION: "built_and_tested" requires e2e reference');
      totalIssues++;
    }
  }

  const hasTestRef = evidence && evidence.includes('e2e/');
  const specMatches = evidence.match(/e2e\/[\w.-]+\.spec\.ts/g);

  if (hasTestRef && specMatches) {
    let allOk = true;
    for (const spec of specMatches) {
      const fp = resolve(ROOT, spec);
      if (!existsSync(fp)) {
        issues.push('e2e test NOT FOUND: ' + spec);
        totalIssues++;
        allOk = false;
      }
    }
    if (allOk) verified++;
  } else if (hasTestRef && !specMatches) {
    issues.push('Could not parse e2e test reference from evidence');
    needsManual++;
  } else {
    // File-path-based evidence
    const fp = resolveFilePath(evidence);
    if (fp) {
      if (!existsSync(fp)) {
        issues.push('File not found: ' + fp.replace(ROOT + '/', ''));
        totalIssues++;
      } else {
        verified++;
        const reach = checkReachability(fp);
        if (reach && !reach.ok) {
          issues.push('REACHABILITY: ' + reach.msg);
          reachabilityFlags++;
        }
      }
    } else {
      // Multi-file evidence
      const fileRefs = evidence.match(/[\w./-]+\.(tsx|ts|mjs|sql|json)/g);
      if (fileRefs) {
        const unique = [...new Set(fileRefs)];
        const knownFiles = [
          'BrandSettings.tsx','Header.tsx','AdminPurchaseOrderDetail.tsx',
          'types.ts','Home.tsx','DemoBanner.tsx','BrandGuidance.tsx',
          'LiveChatWidget.tsx','TourEngine.tsx',
          'ShippingCostEstimate.tsx','BrandReports.tsx',
          'BrandReturns.tsx','ProductCatalog.tsx','SalesAnalytics.tsx',
          'BrandSelfService.tsx','App.tsx','BrandCrmDepth.tsx',
          'crmStore.ts','shippingCalculator.ts','tamSamPipeline.ts',
          'TamSamDisplay.tsx','productResearchEngine.ts','keepaClient.ts',
          'alibabaClient.ts','manufacturerSourcingEngine.ts',
          'researchEngine.ts','dataSources.ts','rbac.ts',
          'BankFinancingSection.tsx','InvestorPitchSection.tsx',
          'MonitoringDashboard.tsx','HelpdeskDashboard.tsx',
          'ProductResearchSection.tsx','ManufacturerSourcingSection.tsx',
          'GrantsInvestorsSection.tsx','engine.ts','firecrawlClient.ts',
          'wordingSafety.ts','budget.ts',
        ];
        const filtered = unique.filter(f => knownFiles.some(k => f.endsWith(k)) || f.includes('/'));
        for (const fr of filtered) {
          const fpp = resolveFilePath(fr);
          if (fpp) {
            if (!existsSync(fpp)) {
              issues.push('File not found: ' + fpp.replace(ROOT + '/', ''));
              totalIssues++;
            } else {
              verified++;
              if (fpp.includes('/components/')) {
                const reach = checkReachability(fpp);
                if (reach && !reach.ok) {
                  issues.push('REACHABILITY: ' + reach.msg);
                  reachabilityFlags++;
                }
              }
            }
          }
        }
      } else {
        issues.push('Cannot verify evidence: ' + evidence.slice(0, 80) + '...');
        needsManual++;
      }
    }
  }

  if (issues.length > 0) {
    console.log('[' + status + '] ' + id + ': ' + description);
    for (const i of issues) console.log('  ' + i);
    console.log();
  }
}

// ── Summary
const statusCounts = {};
for (const e of entries) statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
console.log('\n-- STATUS SUMMARY --');
for (const [s, c] of Object.entries(statusCounts).sort()) console.log('  ' + s + ': ' + c);
console.log('\n-- VERIFICATION --');
console.log('  Files/tests verified: ' + verified);
console.log('  Needs manual check:  ' + needsManual);
console.log('  Issues found:        ' + totalIssues);
console.log('  Reachability flags:  ' + reachabilityFlags);

if (totalIssues > 0) {
  console.log('\n  ' + totalIssues + ' issue(s) found -- review flagged entries above.\n');
} else {
  console.log('\nAll checkable references verified.\n');
}
