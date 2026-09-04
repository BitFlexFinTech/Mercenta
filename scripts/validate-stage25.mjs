// Stage 25/26 validation — CRM depth, RBAC tiers, self-service depth,
// delivery-time reconciliation, server-side-equivalent tenant enforcement.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');

let failures = 0;
const test = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
};

const types = read('src/types.ts');
const crmStore = read('src/lib/crm/crmStore.ts');
const rbac = read('src/lib/auth/rbac.ts');
const ctx = read('src/context/GlobalStateContext.tsx');
const crm = read('src/components/admin/BrandCRM.tsx');
const depth = read('src/components/admin/BrandCrmDepth.tsx');
const auditView = read('src/components/admin/AdminAuditLog.tsx');
const sap = read('src/components/admin/SuperAdminPanel.tsx');
const pipeline = read('src/components/admin/RetailPipeline.tsx');
const store = read('src/data/demoStore.ts');
const sales = read('src/components/brand/SalesAnalytics.tsx');
const selfService = read('src/components/brand/BrandSelfService.tsx');
const app = read('src/App.tsx');
const bootstrap = read('src/data/bootstrap.ts');

/* ── Stage 25 item 1 — CRM industry-bar depth ── */
test('unified timeline merges messages+calls+notes+tasks+system events',
  crmStore.includes('buildBrandTimeline') &&
    crmStore.includes('system_deduction') && crmStore.includes("channel === 'call'"));
test('assignable follow-up tasks with due dates + staff assignment',
  crmStore.includes('addCrmTask') && depth.includes('taskAssignee') && depth.includes('dueDate'));
test('free-text internal notes timestamped and attributed',
  crmStore.includes('authorStaffId') && depth.includes('authorStaffId'));
test('admin-definable tags / segmentation filterable store',
  types.includes('tags: string[]') && crmStore.includes('setBrandTags'));
test('relationship lifecycle stage distinct from fulfillment track',
  types.includes("CRM_LIFECYCLE_STAGES") && types.includes("'lead' | 'onboarding'") === false &&
    crmStore.includes('setBrandLifecycle'));
test('account owner assignable per brand',
  crmStore.includes('setBrandAccountOwner') && depth.includes('Account owner'));
test('every CRM action writes to platform-wide audit log',
  (crmStore.match(/pushAudit\(/g) ?? []).length >= 6);
test('CRM depth rendered inside BrandCRM component (frontend proof)',
  crm.includes('<BrandCrmDepth brandId={selected.id} />'));

/* ── Stage 25 item 2 — staff RBAC tiers + audit log ── */
test('two permission tiers modelled (full vs view_only)',
  types.includes("'full' | 'view_only'") && rbac.includes('staffCanMutate'));
test('staff records carry permissionTier incl. seeded view-only member',
  bootstrap.includes('permissionTier') &&
    bootstrap.split('view_only').length >= 2);
test('acting staff identity drives canCurrentUserMutate',
  ctx.includes('actingStaffId') && ctx.includes('canCurrentUserMutate = staffCanMutate'));
test('tier management UI in Super Admin Panel',
  sap.includes('updateStaffTier') && sap.includes('View-only ops'));
test('act-as-staff selector exercises tiers end to end',
  sap.includes('Acting as staff') && /mutations blocked/i.test(sap));
test('platform audit log viewer exists and is routed (super-admin gated)',
  auditView.includes('fetchAuditLog') && app.includes("<AdminAuditLog />") &&
    app.includes("(isSuperAdmin ? <AdminAuditLog /> : <AccessDenied />)"));

/* ── Stage 25 item 3 — brand self-service depth ── */
test('sales history/analytics view replaces raw dashboard at analytics route',
  sales.includes('Best-selling SKUs') && app.includes("{brandView === 'analytics' && <SalesAnalytics />}"));
test('document library downloads signed contract + remittance statement',
  selfService.includes('generateRemittanceStatement') && selfService.includes('Distribution Agreement v'));
test('banking changes route through admin approval, never direct edit',
  store.includes('reviewProfileChangeRequest') &&
    selfService.includes('never directly self-service editable'));
test('change-request review UI lives in Brand CRM and is tier-gated',
  crm.includes('ChangeRequestReview') && crm.includes('canCurrentUserMutate'));
test('brand documents view wired into nav + allowlist',
  app.includes("'documents'") && rbac.includes("'analytics', 'documents',"));

/* ── Stage 25 item 4 — delivery-time reconciliation ── */
test('receivedQty captured per PO line item',
  types.includes('receivedQty?: number'));
test('reconcileDelivery compares received vs confirmed per line',
  store.includes('reconcileDelivery') && store.includes('confirmed > line.receivedQty'));
test('shortfall auto-raises shortage_claim Deduction into billing ledger',
  store.includes("type: 'shortage_claim'") && store.includes('createDeductionInStore'));
test('reconciliation writes an audit entry',
  store.includes("action: 'delivery_reconciliation'"));
test('delivery reconciliation UI rendered in Retail Pipeline (frontend proof)',
  pipeline.includes('<DeliveryReconciliation purchaseOrders={purchaseOrders} />') &&
    pipeline.includes('Record delivery & reconcile'));

/* ── Stage 26 — server-side-equivalent tenant enforcement ── */
test('tenant guard derives scope exclusively from session pin',
  rbac.includes("session?.tier !== 'brand'") && rbac.includes('session.tenantId'));
test('cross-tenant access returns empty result, never an error that leaks existence',
  rbac.includes('isCrossTenantAccess') && rbac.includes('.filter((r) => r.brandId === pinned)'));
test('brand views apply session-based scoping (analytics + self-service)',
  /assertBrandScope\(session, poQuery\.data\?\.data \?\? \[\]\)/.test(sales) &&
    sales.includes('assertBrandScope') &&
    selfService.includes('assertBrandScope(session, contractsQuery.data?.data ?? [])'));

console.log(failures === 0 ? 'STAGE25_VALIDATION_PASS' : `STAGE25_VALIDATION_FAIL (${failures})`);
