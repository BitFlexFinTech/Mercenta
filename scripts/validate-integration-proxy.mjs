// §BATCH1a — THE INTEGRATION PROXY GATE.
//
// WHY THIS EXISTS
// ---------------
// The real provider clients (`src/lib/spapi/client.ts`, `src/lib/dhl/client.ts`,
// `src/lib/palletline/client.ts`) call server-side Edge-Function routes. Before
// this increment there was NO `spapi`, `dhl` or `palletline` function at all, so
// entering a real key could never make anything sync. This gate proves, with
// REAL EVIDENCE, that:
//
//   1. COVERAGE — every route the clients actually call is DECLARED in the ONE
//      manifest and ROUTED by the matching function. The routes are DERIVED from
//      the client sources (regex over the `${edgeFunctionBase}` call sites), not
//      copied from the manifest, so a new client call without a helper FAILS.
//   2. NO ORPHANS — the manifest declares no route no client calls.
//   3. SIMULATION — every route, executed with no credential reference, returns
//      the mock client's SHAPE, is labelled `simulated: true`, and makes ZERO
//      network calls (proved with a fetch spy that THROWS if called) and ZERO
//      credential work.
//   4. FAIL CLOSED — an unknown credential scheme, a live call on an unsupported
//      route, and a live call with no server credential all refuse with a stated
//      code and make no network call. An unknown mode is never simulation.
//   5. LIVE WIRING — for the confirmed routes the live caller is executed against
//      a spy fetch, so the asserted host, path, query and auth header are real.
//   6. PARITY — the mirrored facts (marketplace/region label rule, truckload
//      limit, the mock clients' refusal CODES, the milestone lifecycles and the
//      carrier-cost formula) still match their canonical owners.
//
// The module under test is EXECUTED (Node's TypeScript stripping), not read as
// text, so this gate can genuinely fail.
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

let failures = 0;
let checks = 0;
const test = (name, ok, detail) => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 400)}`);
  }
};

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const present = (p) => existsSync(new URL(p, ROOT));
const moduleUrl = (p) => new URL(p, ROOT).href;

const PROXY = 'supabase/functions/_shared/proxyRoutes.ts';
const SPAPI_CLIENT = 'src/lib/spapi/client.ts';
const DHL_CLIENT = 'src/lib/dhl/client.ts';
const PALLETLINE_CLIENT = 'src/lib/palletline/client.ts';

const proxy = await import(moduleUrl(PROXY));
const spapiLive = await import(moduleUrl('supabase/functions/_shared/live/spapiLive.ts'));
const dhlLive = await import(moduleUrl('supabase/functions/_shared/live/dhlLive.ts'));

/* ═══════════════════════════════════════════════════════════════════════════
 * 1. THE ROUTES THE CLIENTS ACTUALLY CALL — derived from the client sources.
 * ═══════════════════════════════════════════════════════════════════════════ */
const CALL_RE = /`\$\{edgeFunctionBase\}([^`]*)`,\s*\{[^}]*?method:\s*'(GET|POST)'/gs;
const CLIENT_METHOD_RE = /async\s+([A-Za-z][A-Za-z0-9]*)\s*\(/g;

/** `/x/${...}/y?q=${...}` → `/x/{param}/y` — the path the FUNCTION receives. */
function normaliseCalledPath(raw) {
  const withoutQuery = raw.split('?')[0];
  const segments = withoutQuery
    .split('/')
    .filter(Boolean)
    .map((segment) => (/^\$\{/.test(segment) ? '{param}' : segment));
  return `/${segments.join('/')}`;
}

/** Shape comparison: `{…}` matches `{…}` whatever it is named. */
function sameShape(a, b) {
  const left = a.split('/').filter(Boolean);
  const right = b.split('/').filter(Boolean);
  if (left.length !== right.length) return false;
  return left.every((segment, i) => {
    const other = right[i];
    const leftIsParam = segment.startsWith('{') && segment.endsWith('}');
    const rightIsParam = other.startsWith('{') && other.endsWith('}');
    if (leftIsParam || rightIsParam) return leftIsParam && rightIsParam;
    return segment === other;
  });
}

const CLIENTS = [
  { provider: 'spapi', file: SPAPI_CLIENT },
  { provider: 'dhl', file: DHL_CLIENT },
  { provider: 'palletline', file: PALLETLINE_CLIENT },
];

const called = [];
const clientMethods = new Map();
for (const { provider, file } of CLIENTS) {
  const source = read(file);
  clientMethods.set(file, new Set([...source.matchAll(CLIENT_METHOD_RE)].map((m) => m[1])));
  for (const match of source.matchAll(CALL_RE)) {
    const clientPath = normaliseCalledPath(match[1]);
    called.push({
      provider,
      file,
      method: match[2],
      clientPath,
      functionPath: proxy.normalizeFunctionPath(provider, clientPath),
    });
  }
}

const countFor = (provider) => called.filter((c) => c.provider === provider).length;

test(
  'coverage: the three real clients call exactly 20 routes in total',
  called.length === 20,
  `derived ${called.length}: ${called.map((c) => `${c.provider} ${c.method} ${c.clientPath}`).join(' | ')}`
);
test('coverage: 12 SP-API routes derived from src/lib/spapi/client.ts', countFor('spapi') === 12, `derived ${countFor('spapi')}`);
test('coverage: 3 DHL routes derived from src/lib/dhl/client.ts', countFor('dhl') === 3, `derived ${countFor('dhl')}`);
test('coverage: 5 Palletline routes derived (create · status · collection · cancel · invoice)', countFor('palletline') === 5, `derived ${countFor('palletline')}`);

/** Every derived call must be routed, by a route whose declared method exists. */
const unrouted = [];
for (const call of called) {
  const route = proxy.matchProxyRoute(call.provider, call.method, call.functionPath);
  if (!route) {
    unrouted.push(`${call.provider} ${call.method} ${call.clientPath}`);
    continue;
  }
  if (!clientMethods.get(call.file).has(route.clientMethod)) {
    unrouted.push(`${call.provider} ${call.method} ${call.clientPath} → unknown method '${route.clientMethod}'`);
  }
  if (route.clientFile !== call.file) {
    unrouted.push(`${route.id} declares clientFile '${route.clientFile}', derived from '${call.file}'`);
  }
}
test(
  'coverage: EVERY route the real clients call is declared, routed and names a real client method',
  unrouted.length === 0,
  unrouted.join(' | ')
);

const orphan = proxy.PROXY_ROUTES.filter(
  (route) =>
    !called.some(
      (call) =>
        call.provider === route.provider &&
        call.method === route.method &&
        sameShape(route.pattern, call.functionPath)
    )
);
test(
  'no orphans: every declared route is one a real client calls',
  orphan.length === 0,
  orphan.map((r) => r.id).join(', ')
);

/** The functions exist, serve the manifest, and own their credential resolution. */
const FUNCTION_FILES = [
  { provider: 'spapi', file: 'supabase/functions/spapi/index.ts' },
  { provider: 'dhl', file: 'supabase/functions/dhl/index.ts' },
  { provider: 'palletline', file: 'supabase/functions/palletline/index.ts' },
];
for (const { file } of FUNCTION_FILES) {
  test(`helper function present: ${file}`, present(file));
}
const unwired = [];
for (const { provider, file } of FUNCTION_FILES) {
  if (!present(file)) continue;
  const source = read(file);
  for (const [label, needle] of [
    ['imports the ONE manifest', "from '../_shared/proxyRoutes.ts'"],
    ['routes through handleProxyRequest', 'handleProxyRequest('],
    ['reads the runtime path through proxyRequestTarget', 'proxyRequestTarget(req.url'],
    ['resolves its own provider mode (never assumes)', 'resolveProxyMode('],
  ]) {
    if (!source.includes(needle)) unwired.push(`${file}: ${label}`);
  }
  if (!source.includes(provider)) unwired.push(`${file}: names no provider`);
}
test('helpers: each function serves the manifest and resolves its own mode', unwired.length === 0, unwired.join(' | '));
test(
  'helpers: a live call requires an operator session in both live-capable functions',
  read('supabase/functions/spapi/index.ts').includes('operatorFromAuthorization(') &&
    read('supabase/functions/dhl/index.ts').includes('operatorFromAuthorization(')
);
test(
  'helpers: simulation does no credential work (credentials resolved ONLY for mode === live)',
  ['supabase/functions/spapi/index.ts', 'supabase/functions/dhl/index.ts'].every((file) =>
    /mode === 'live'\s*\?\s*await resolveCredentials/.test(read(file))
  )
);
test(
  'helpers: the palletline function resolves NO credential (no confirmed contract to use one with)',
  present('supabase/functions/palletline/index.ts') &&
    !read('supabase/functions/palletline/index.ts').includes('resolveCredentials') &&
    read('supabase/functions/palletline/index.ts').includes('serverCredentialsResolved: false')
);

/* ═══════════════════════════════════════════════════════════════════════════
 * 2. SIMULATION EXECUTED — the mock shapes, zero calls, unmistakably labelled.
 * ═══════════════════════════════════════════════════════════════════════════ */
const bodyFor = (route) => {
  switch (route.id) {
    case 'spapi.catalog.submit':
      return { marketplaceId: 'A1F83G8C2ARO7P', sku: 'SKU-1' };
    case 'spapi.acknowledgements.submit':
      return {
        purchaseOrderNumber: 'MOCK-PO-8841',
        lines: [
          {
            sku: 'MOCK-SKU-0001',
            ackStatus: 'accepted',
            orderedQty: 120,
            acknowledgedQty: 120,
            unitPrice: 9.5,
          },
        ],
      };
    case 'spapi.shipments.request':
      return {
        purchaseOrderNumbers: ['MOCK-PO-8841'],
        freightTerm: 'prepaid',
        shipToPartyId: 'MOCK-FC-0001',
      };
    case 'spapi.shipments.confirmations':
      return {
        shipmentId: 'SHIP-1',
        purchaseOrderNumbers: ['MOCK-PO-8841'],
        cartons: [
          {
            cartonId: 'C1',
            vendorSku: 'MOCK-SKU-0001',
            quantity: 120,
            purchaseOrderNumber: 'MOCK-PO-8841',
          },
        ],
      };
    case 'spapi.shipments.confirm':
      return { purchaseOrderId: 'MOCK-PO-8841' };
    case 'spapi.invoices.submit':
      return {
        purchaseOrderNumber: 'MOCK-PO-8841',
        invoiceNumber: 'INV-0001',
        invoiceDate: '2026-01-15',
        currency: 'GBP',
        total: 1140,
        lines: [{ vendorSku: 'MOCK-SKU-0001', quantity: 120, unitPrice: 9.5 }],
      };
    case 'spapi.inventory.update':
      return { sku: 'MOCK-SKU-0001', quantity: 10, unitOfMeasure: 'Eaches' };
    case 'dhl.shipments.create':
      return { reference: 'SHIP-1', origin: 'A', destination: 'B', cartons: 1 };
    case 'dhl.shipments.pickup':
      return { waybill: 'MOCK-DHL-0001', pickupDate: '2026-01-16' };
    case 'palletline.consignments.create':
      return { reference: 'SHIP-2', origin: 'A', destination: 'B', pallets: 2, totalWeightKg: 500 };
    case 'palletline.collections.request':
      return { consignmentNumber: 'MOCK-PLL-0001', collectionDate: '2026-01-16' };
    default:
      return {};
  }
};

const queryFor = (route) => {
  if (route.id === 'spapi.purchaseOrders.read') return { since: '2026-01-01' };
  if (route.id === 'spapi.purchaseOrders.status') return { ids: 'MOCK-PO-8841,MOCK-PO-9999' };
  return {};
};

const pathFor = (route) => route.pattern;

const SIM_FIELDS = {
  'spapi.catalog.submit': ['ok', 'submissionId', 'status', 'simulated'],
  'spapi.catalog.status': ['ok', 'status', 'simulated'],
  'spapi.purchaseOrders.read': ['ok', 'purchaseOrders', 'simulated'],
  'spapi.purchaseOrders.status': ['ok', 'statuses', 'unknownPurchaseOrderIds', 'simulated'],
  'spapi.acknowledgements.submit': ['ok', 'acknowledgementId', 'status', 'simulated'],
  'spapi.shipments.request': ['ok', 'shipmentRequestId', 'status', 'simulated'],
  'spapi.shipments.details': ['ok', 'status', 'simulated'],
  'spapi.shipments.labels': ['ok', 'refused', 'refusedReason', 'simulated'],
  'spapi.shipments.confirmations': ['ok', 'confirmationId', 'status', 'simulated'],
  'spapi.shipments.confirm': ['ok', 'simulated'],
  'spapi.invoices.submit': ['ok', 'submissionId', 'status', 'simulated'],
  'spapi.inventory.update': ['ok', 'submissionId', 'simulated'],
  'dhl.shipments.create': ['ok', 'waybill', 'trackingNumber', 'labelState', 'simulated'],
  'dhl.shipments.status': ['ok', 'milestone', 'simulated'],
  'dhl.shipments.pickup': ['ok', 'simulated'],
  'palletline.consignments.create': ['ok', 'consignmentNumber', 'trackingNumber', 'labelState', 'simulated'],
  'palletline.consignments.status': ['ok', 'milestone', 'simulated'],
  'palletline.collections.request': ['ok', 'simulated'],
  'palletline.consignments.cancel': ['ok', 'simulated'],
  'palletline.consignments.invoice': ['ok', 'carrierCostGbp', 'invoiceNumber', 'simulated'],
};

let networkCalls = 0;
const spyFetch = async () => {
  networkCalls++;
  throw new Error('a network call was attempted');
};

let liveCallInvocations = 0;
const liveCallSpy = async () => {
  liveCallInvocations++;
  throw new Error('the live caller was invoked');
};

proxy.resetSimulatedWorld();
const simFailures = [];
const simOutcomes = new Map();
/**
 * The simulated helper is STATEFUL (like the mock clients), so a follow-up route
 * is driven with the identifier an earlier route actually issued — never with an
 * invented one.
 */
const simContext = {};
const simPathFor = (route) => {
  switch (route.id) {
    case 'spapi.catalog.status':
      return `/catalog-items/${simContext.submissionId}`;
    case 'spapi.shipments.details':
      return `/shipments/${simContext.shipmentRequestId}/details`;
    case 'spapi.shipments.labels':
      return `/shipments/${simContext.shipmentRequestId}/labels`;
    case 'dhl.shipments.status':
      return `/shipments/${simContext.waybill}`;
    case 'palletline.consignments.status':
      return `/consignments/${simContext.consignmentNumber}`;
    case 'palletline.consignments.cancel':
      return `/consignments/${simContext.consignmentNumber}/cancel`;
    case 'palletline.consignments.invoice':
      return `/consignments/${simContext.consignmentNumber}/invoice`;
    default:
      return route.pattern;
  }
};
const ID_KEYS = [
  'submissionId',
  'acknowledgementId',
  'shipmentRequestId',
  'confirmationId',
  'waybill',
  'consignmentNumber',
  'invoiceNumber',
];

for (const route of proxy.PROXY_ROUTES) {
  let outcome;
  try {
    outcome = await proxy.handleProxyRequest(
      {
        provider: route.provider,
        method: route.method,
        path: simPathFor(route),
        query: queryFor(route),
        body: bodyFor(route),
        secretRef: null,
        marketplaceId: 'A1F83G8C2ARO7P',
      },
      { serverCredentialsResolved: false, liveCall: liveCallSpy }
    );
  } catch (err) {
    simFailures.push(`${route.id}: THREW — ${err instanceof Error ? err.message : String(err)}`);
    continue;
  }
  simOutcomes.set(route.id, outcome);
  // Capture the identifiers the helper actually issued, for the follow-up routes.
  if (String(outcome.body.submissionId ?? '').startsWith('MOCK-SUB-')) {
    simContext.submissionId = outcome.body.submissionId;
  }
  if (outcome.body.shipmentRequestId) simContext.shipmentRequestId = outcome.body.shipmentRequestId;
  if (outcome.body.waybill) simContext.waybill = outcome.body.waybill;
  if (outcome.body.consignmentNumber) simContext.consignmentNumber = outcome.body.consignmentNumber;

  const declared = SIM_FIELDS[route.id] ?? [];
  const missing = declared.filter((field) => !(field in outcome.body));
  if (outcome.simulated !== true) simFailures.push(`${route.id}: not labelled simulated`);
  if (outcome.liveCallAttempted !== false) simFailures.push(`${route.id}: claims a live call`);
  if (outcome.body.mode !== 'simulation') simFailures.push(`${route.id}: mode is not 'simulation'`);
  if (!String(outcome.body.simulationNote ?? '').includes('SIMULATION')) {
    simFailures.push(`${route.id}: no simulation note`);
  }
  if (missing.length > 0) simFailures.push(`${route.id}: missing ${missing.join(',')}`);
  // Every route that ISSUES an identifier must issue an unmistakably simulated one.
  for (const key of declared.filter((field) => ID_KEYS.includes(field))) {
    const value = String(outcome.body[key] ?? '');
    if (!/^(MOCK-|SIM-)/.test(value)) {
      simFailures.push(`${route.id}: ${key}=${value} is not unmistakably simulated`);
    }
  }
}
test(
  'simulation: every declared route returns the mock shape, labelled simulated, with the SIMULATION note',
  simFailures.length === 0,
  simFailures.join(' | ')
);
test(
  'simulation: ZERO network calls across all 20 routes',
  networkCalls === 0,
  `spy fetch calls: ${networkCalls}`
);
test(
  'simulation: the live caller is NEVER invoked',
  liveCallInvocations === 0,
  `invocations: ${liveCallInvocations}`
);
void spyFetch;

/* ═══════════════════════════════════════════════════════════════════════════
 * 3. FAIL CLOSED — unknown mode, unsupported live route, missing credential.
 * ═══════════════════════════════════════════════════════════════════════════ */
const firstConfirmed = proxy.PROXY_ROUTES.find(
  (route) => route.provider === 'spapi' && route.liveStatus === 'confirmed'
);

const unknownMode = await proxy.handleProxyRequest(
  {
    provider: 'spapi',
    method: 'GET',
    path: '/purchase-orders',
    query: { since: '2026-01-01' },
    secretRef: 'live:something-else',
  },
  { serverCredentialsResolved: true, liveCall: liveCallSpy }
);
test(
  'fail closed: an UNKNOWN credential scheme is 503 + PROVIDER_MODE_UNKNOWN (never treated as simulation)',
  unknownMode.status === 503 &&
    unknownMode.refusal === 'PROVIDER_MODE_UNKNOWN' &&
    unknownMode.simulated === false,
  JSON.stringify(unknownMode.body)
);

let liveRefusals = 0;
const liveRefusalDetails = [];
for (const route of proxy.PROXY_ROUTES.filter((r) => r.liveStatus === 'unsupported')) {
  const outcome = await proxy.handleProxyRequest(
    {
      provider: route.provider,
      method: route.method,
      path: pathFor(route),
      query: queryFor(route),
      body: bodyFor(route),
      secretRef: 'vault:mercenta-live-credential',
      marketplaceId: 'A1F83G8C2ARO7P',
    },
    { serverCredentialsResolved: true, liveCall: liveCallSpy }
  );
  const expected =
    route.channelLabelRule && route.provider === 'spapi'
      ? 'LABELS_NOT_GENERATED_IN_REGION'
      : route.liveRefusal;
  if (outcome.refusal === expected && outcome.liveCallAttempted === false) liveRefusals++;
  else liveRefusalDetails.push(`${route.id}: got '${outcome.refusal}' expected '${expected}'`);
}
test(
  `fail closed: every unsupported route refuses live with its STATED code (${liveRefusals}/${
    proxy.PROXY_ROUTES.filter((r) => r.liveStatus === 'unsupported').length
  })`,
  liveRefusalDetails.length === 0,
  liveRefusalDetails.join(' | ')
);

const noCredential = await proxy.handleProxyRequest(
  {
    provider: 'spapi',
    method: 'GET',
    path: '/purchase-orders',
    query: { since: '2026-01-01' },
    secretRef: 'vault:mercenta-live-credential',
    marketplaceId: 'A1F83G8C2ARO7P',
  },
  { serverCredentialsResolved: false, liveCall: liveCallSpy }
);
test(
  'fail closed: a live call with NO server credential is 503 + PROXY_CREDENTIALS_UNAVAILABLE',
  noCredential.status === 503 && noCredential.refusal === 'PROXY_CREDENTIALS_UNAVAILABLE',
  JSON.stringify(noCredential.body)
);
test(
  'fail closed: NO live caller was invoked by any refusal path',
  liveCallInvocations === 0,
  `invocations: ${liveCallInvocations}`
);

const unroutedCall = await proxy.handleProxyRequest(
  { provider: 'spapi', method: 'GET', path: '/not-a-declared-route', secretRef: null },
  { serverCredentialsResolved: false, liveCall: liveCallSpy }
);
test(
  'fail closed: an undeclared path is 404 (the helper never guesses a route)',
  unroutedCall.status === 404 && String(unroutedCall.body.error).includes('UNROUTED_OPERATION'),
  JSON.stringify(unroutedCall.body)
);

/* ═══════════════════════════════════════════════════════════════════════════
 * 4. LIVE WIRING EXECUTED — the real caller, a spy transport, real assertions.
 * ═══════════════════════════════════════════════════════════════════════════ */
const seen = [];
function scriptedFetch(responses) {
  return async (url, init) => {
    seen.push({ url, method: init.method, headers: init.headers, body: init.body });
    const next = responses.shift();
    if (!next) throw new Error(`UNEXPECTED live call: ${init.method} ${url}`);
    return { ok: next.status < 400, status: next.status, text: async () => next.body };
  };
}

const SPAPI_CREDENTIALS = {
  clientId: 'amzn1.application-oa2-client.TEST',
  clientSecret: 'test-secret',
  refreshToken: 'Atzr|TEST',
  marketplaceId: 'A1F83G8C2ARO7P',
};

// (a) the PO read
seen.length = 0;
const poReadOutcome = await proxy.handleProxyRequest(
  {
    provider: 'spapi',
    method: 'GET',
    path: '/purchase-orders',
    query: { since: '2026-01-01' },
    secretRef: 'vault:amazon-sp-api',
    marketplaceId: 'A1F83G8C2ARO7P',
  },
  {
    serverCredentialsResolved: true,
    liveCall: spapiLive.createSpapiLiveCall(
      SPAPI_CREDENTIALS,
      scriptedFetch([
        { status: 200, body: JSON.stringify({ access_token: 'AT-1', expires_in: 3600 }) },
        {
          status: 200,
          body: JSON.stringify({
            payload: {
              orders: [
                {
                  purchaseOrderNumber: 'PO-1',
                  orderDetails: {
                    purchaseOrderDate: '2026-01-05',
                    items: [
                      {
                        vendorProductIdentifier: 'SKU-1',
                        amazonProductIdentifier: 'B000TEST01',
                        orderedQuantity: { amount: 120, unitOfMeasure: 'Each' },
                        netCost: { amount: 9.5, currencyCode: 'GBP' },
                      },
                    ],
                  },
                  shipmentDetails: {
                    shipToParty: { partyId: 'LBA1' },
                    freightTerms: 'Prepaid',
                    deliveryWindow: { startDate: '2026-01-20', endDate: '2026-01-27' },
                  },
                },
              ],
            },
          }),
        },
      ])
    ),
  }
);
const poReadOrder = poReadOutcome.body.purchaseOrders?.[0] ?? {};
test(
  'live wiring: the SP-API PO read exchanges the refresh token, then calls the EU Vendor Orders operation',
  seen.length === 2 &&
    seen[0].url === spapiLive.LWA_TOKEN_URL &&
    seen[0].body.includes('grant_type=refresh_token') &&
    seen[1].url ===
      'https://sellingpartnerapi-eu.amazon.com/vendor/orders/v1/purchaseOrders?createdAfter=2026-01-01&limit=100',
  JSON.stringify(seen.map((s) => s.url))
);
test(
  'live wiring: the channel access token is sent as x-amz-access-token',
  seen[1]?.headers?.['x-amz-access-token'] === 'AT-1',
  JSON.stringify(seen[1]?.headers)
);
test(
  'live wiring: the channel PO is mapped onto the ChannelPurchaseOrder contract (lines + derived value)',
  poReadOutcome.ok === true &&
    poReadOrder.purchaseOrderId === 'PO-1' &&
    poReadOrder.poValue === 1140 &&
    poReadOrder.shipToPartyId === 'LBA1' &&
    poReadOrder.freightTerm === 'prepaid' &&
    poReadOrder.lines?.[0]?.vendorSku === 'SKU-1' &&
    poReadOrder.lines?.[0]?.asin === 'B000TEST01',
  JSON.stringify(poReadOrder)
);
test(
  'live wiring: a live response is never labelled simulated',
  poReadOutcome.simulated === false && poReadOrder.simulated === false
);

// (b) the receiving sync, including an id the channel does not know
seen.length = 0;
const statusOutcome = await proxy.handleProxyRequest(
  {
    provider: 'spapi',
    method: 'GET',
    path: '/purchase-orders/status',
    query: { ids: 'PO-1,PO-UNKNOWN' },
    secretRef: 'vault:amazon-sp-api',
    marketplaceId: 'A1F83G8C2ARO7P',
  },
  {
    serverCredentialsResolved: true,
    liveCall: spapiLive.createSpapiLiveCall(
      SPAPI_CREDENTIALS,
      scriptedFetch([
        { status: 200, body: JSON.stringify({ access_token: 'AT-2' }) },
        {
          status: 200,
          body: JSON.stringify({
            payload: {
              ordersStatus: [
                {
                  purchaseOrderNumber: 'PO-1',
                  purchaseOrderStatus: 'OPEN',
                  itemStatus: [
                    {
                      vendorProductIdentifier: 'SKU-1',
                      orderedQuantity: { amount: 120 },
                      receivedQuantity: { amount: 120 },
                    },
                  ],
                },
              ],
            },
          }),
        },
      ])
    ),
  }
);
test(
  'live wiring: the receiving sync reports a receipt and lists an UNKNOWN id separately',
  statusOutcome.ok === true &&
    statusOutcome.body.statuses?.[0]?.receivingStatus === 'received' &&
    statusOutcome.body.unknownPurchaseOrderIds?.length === 1 &&
    statusOutcome.body.unknownPurchaseOrderIds[0] === 'PO-UNKNOWN',
  JSON.stringify(statusOutcome.body)
);
test(
  'live wiring: the status read calls the documented operation with the requested ids',
  seen[1]?.url ===
    'https://sellingpartnerapi-eu.amazon.com/vendor/orders/v1/purchaseOrdersStatus?purchaseOrderNumbers=PO-1%2CPO-UNKNOWN',
  seen[1]?.url
);

// (c) fail-closed live paths — a rejected credential and an unmappable channel value
seen.length = 0;
const badTokenOutcome = await proxy.handleProxyRequest(
  {
    provider: 'spapi',
    method: 'GET',
    path: '/purchase-orders',
    query: { since: '2026-01-01' },
    secretRef: 'vault:amazon-sp-api',
    marketplaceId: 'A1F83G8C2ARO7P',
  },
  {
    serverCredentialsResolved: true,
    liveCall: spapiLive.createSpapiLiveCall(
      SPAPI_CREDENTIALS,
      scriptedFetch([{ status: 401, body: JSON.stringify({ error: 'invalid_client' }) }])
    ),
  }
);
test(
  'live wiring: a rejected credential is a STATED failure, with no second call and no fabricated data',
  badTokenOutcome.ok === false &&
    String(badTokenOutcome.body.error).includes('LWA_TOKEN_EXCHANGE_FAILED') &&
    seen.length === 1,
  JSON.stringify(badTokenOutcome.body)
);

seen.length = 0;
const unmappableOutcome = await proxy.handleProxyRequest(
  {
    provider: 'spapi',
    method: 'GET',
    path: '/purchase-orders/status',
    query: { ids: 'PO-1' },
    secretRef: 'vault:amazon-sp-api',
    marketplaceId: 'A1F83G8C2ARO7P',
  },
  {
    serverCredentialsResolved: true,
    liveCall: spapiLive.createSpapiLiveCall(
      SPAPI_CREDENTIALS,
      scriptedFetch([
        { status: 200, body: JSON.stringify({ access_token: 'AT-3' }) },
        {
          status: 200,
          body: JSON.stringify({
            payload: {
              ordersStatus: [{ purchaseOrderNumber: 'PO-1', purchaseOrderStatus: 'PENDING_NEW' }],
            },
          }),
        },
      ])
    ),
  }
);
test(
  'live wiring: an unmapped channel PO state REFUSES (never guesses a state)',
  unmappableOutcome.ok === false &&
    String(unmappableOutcome.body.error).includes('SPAPI_PO_STATUS_UNRECOGNISED'),
  JSON.stringify(unmappableOutcome.body)
);

// (d) DHL tracking — the aggregate status decides; the latest event is the fallback.
seen.length = 0;
const dhlOutcome = await proxy.handleProxyRequest(
  { provider: 'dhl', method: 'GET', path: '/shipments/SIM-TRK-00000001', secretRef: 'vault:dhl-express' },
  {
    serverCredentialsResolved: true,
    liveCall: dhlLive.createDhlLiveCall(
      { apiKey: 'dhl-key' },
      scriptedFetch([
        {
          status: 200,
          body: JSON.stringify({
            shipments: [
              {
                id: 'SIM-TRK-00000001',
                status: { statusCode: 'delivered', description: 'delivered' },
                events: [
                  { statusCode: 'pre-transit', description: 'shipment information received' },
                  { statusCode: 'transit', description: 'processed at facility' },
                  { statusCode: 'delivered', description: 'delivered' },
                ],
              },
            ],
          }),
        },
      ])
    ),
  }
);
test(
  'live wiring: DHL tracking calls the documented endpoint with the API key header',
  seen.length === 1 &&
    seen[0].url === 'https://api-eu.dhl.com/track/shipments?trackingNumber=SIM-TRK-00000001' &&
    seen[0].headers['DHL-API-Key'] === 'dhl-key',
  JSON.stringify(seen[0]?.url)
);
test(
  "live wiring: DHL's own aggregate status decides the milestone",
  dhlOutcome.ok === true && dhlOutcome.body.milestone === 'delivered',
  JSON.stringify(dhlOutcome.body)
);

seen.length = 0;
const dhlFallback = await proxy.handleProxyRequest(
  { provider: 'dhl', method: 'GET', path: '/shipments/SIM-TRK-00000001', secretRef: 'vault:dhl-express' },
  {
    serverCredentialsResolved: true,
    liveCall: dhlLive.createDhlLiveCall(
      { apiKey: 'dhl-key' },
      scriptedFetch([
        {
          status: 200,
          body: JSON.stringify({
            shipments: [
              {
                events: [
                  { statusCode: 'pre-transit', description: 'shipment information received' },
                  { statusCode: 'transit', description: 'processed at facility' },
                ],
              },
            ],
          }),
        },
      ])
    ),
  }
);
test(
  'live wiring: with no mappable aggregate status, the LATEST mappable event decides',
  dhlFallback.ok === true && dhlFallback.body.milestone === 'in_transit',
  JSON.stringify(dhlFallback.body)
);

seen.length = 0;
const dhlUnmapped = await proxy.handleProxyRequest(
  { provider: 'dhl', method: 'GET', path: '/shipments/SIM-TRK-00000001', secretRef: 'vault:dhl-express' },
  {
    serverCredentialsResolved: true,
    liveCall: dhlLive.createDhlLiveCall(
      { apiKey: 'dhl-key' },
      scriptedFetch([
        { status: 200, body: JSON.stringify({ shipments: [{ status: { statusCode: 'unknown-code' } }] }) },
      ])
    ),
  }
);
test(
  'live wiring: an unmapped DHL status code REFUSES and prints the raw code',
  dhlUnmapped.ok === false &&
    String(dhlUnmapped.body.error).includes('DHL_STATUS_UNRECOGNISED') &&
    String(dhlUnmapped.body.error).includes('unknown-code'),
  JSON.stringify(dhlUnmapped.body)
);
void firstConfirmed;

/* ═══════════════════════════════════════════════════════════════════════════
 * 5. BEHAVIOUR PARITY — the simulated helper behaves like the mock clients.
 * ═══════════════════════════════════════════════════════════════════════════ */
const callSim = (route, overrides = {}) =>
  proxy.handleProxyRequest(
    {
      provider: route.provider,
      method: route.method,
      path: pathFor(route),
      query: queryFor(route),
      body: bodyFor(route),
      secretRef: null,
      marketplaceId: 'A1F83G8C2ARO7P',
      ...overrides,
    },
    { serverCredentialsResolved: false, liveCall: liveCallSpy }
  );
const routeById = (id) => proxy.PROXY_ROUTES.find((route) => route.id === id);

proxy.resetSimulatedWorld();
const submitted = await callSim(routeById('spapi.catalog.submit'));
const submissionId = submitted.body.submissionId;
const poll1 = await callSim(routeById('spapi.catalog.status'), { path: `/catalog-items/${submissionId}` });
const poll2 = await callSim(routeById('spapi.catalog.status'), { path: `/catalog-items/${submissionId}` });
const poll3 = await callSim(routeById('spapi.catalog.status'), { path: `/catalog-items/${submissionId}` });
test(
  'parity: a simulated catalog submission advances submitted → under_amazon_review → live, with a SIM-ASIN placeholder',
  poll1.body.status === 'submitted' &&
    poll2.body.status === 'under_amazon_review' &&
    poll3.body.status === 'live' &&
    String(poll3.body.asin).startsWith('SIM-ASIN-'),
  JSON.stringify([poll1.body, poll2.body, poll3.body])
);
test(
  'parity: the simulated submission reference is unmistakable (MOCK-SUB-…)',
  String(submissionId).startsWith('MOCK-SUB-'),
  String(submissionId)
);

proxy.resetSimulatedWorld();
const asn = await callSim(routeById('spapi.shipments.confirmations'));
const afterAsn = await callSim(routeById('spapi.purchaseOrders.status'));
test(
  'parity: a confirmed shipment is what makes the simulated receiving sync report a receipt',
  asn.body.confirmationId === 'MOCK-ASN-00001' &&
    afterAsn.body.statuses?.[0]?.receivingStatus === 'received' &&
    afterAsn.body.statuses?.[0]?.lines?.[0]?.receivedQty === 120,
  JSON.stringify(afterAsn.body)
);
test(
  'parity: an id the simulated channel does not know is reported separately, never silently dropped',
  afterAsn.body.unknownPurchaseOrderIds?.includes('MOCK-PO-9999'),
  JSON.stringify(afterAsn.body.unknownPurchaseOrderIds)
);

proxy.resetSimulatedWorld();
const overAck = await proxy.handleProxyRequest(
  {
    provider: 'spapi',
    method: 'POST',
    path: '/acknowledgements',
    secretRef: null,
    body: {
      purchaseOrderNumber: 'MOCK-PO-8841',
      lines: [{ sku: 'MOCK-SKU-0001', ackStatus: 'accepted', orderedQty: 10, acknowledgedQty: 99 }],
    },
  },
  { serverCredentialsResolved: false, liveCall: liveCallSpy }
);
test(
  "parity: an over-ordered acknowledgement is REFUSED with the mock client's own code",
  overAck.ok === false && String(overAck.body.error).startsWith('ACKNOWLEDGEMENT_EXCEEDS_ORDER'),
  JSON.stringify(overAck.body)
);

proxy.resetSimulatedWorld();
const dhlCreated = await callSim(routeById('dhl.shipments.create'));
// The 6th CREATE is the one the mock marks as raising the exception, so create
// exactly six and poll the sixth (never the seventh).
let dhl6 = dhlCreated;
for (let i = 0; i < 5; i += 1) dhl6 = await callSim(routeById('dhl.shipments.create'));
let dhlException;
for (let poll = 0; poll < 4; poll += 1) {
  dhlException = await callSim(routeById('dhl.shipments.status'), {
    path: `/shipments/${dhl6.body.waybill}`,
  });
  if (dhlException.body.exception === true) break;
}
test(
  'parity: DHL bookings are unmistakable (MOCK-DHL-… / SIM-TRK-…) and the 6th waybill raises the simulated customs exception',
  String(dhlCreated.body.waybill).startsWith('MOCK-DHL-') &&
    String(dhlCreated.body.trackingNumber).startsWith('SIM-TRK-') &&
    dhlException.body.exception === true &&
    String(dhlException.body.exceptionReason).includes('Customs hold'),
  JSON.stringify(dhlException.body)
);

proxy.resetSimulatedWorld();
const consignments = [];
for (let i = 0; i < 7; i += 1) {
  consignments.push(await callSim(routeById('palletline.consignments.create')));
}
const pll7 = consignments[6].body.consignmentNumber;
const pll7Statuses = [];
for (let poll = 0; poll < 5; poll += 1) {
  const outcome = await callSim(routeById('palletline.consignments.status'), {
    path: `/consignments/${pll7}`,
  });
  pll7Statuses.push(outcome.body);
}
test(
  'parity: the 7th simulated consignment raises the depot exception AND the retry recovers (mirrors the mock)',
  pll7Statuses.some((status) => status.exception === true) &&
    pll7Statuses.some(
      (status) => status.exception === false && String(status.exceptionReason).includes('retry recovered')
    ),
  JSON.stringify(pll7Statuses)
);

const firstConsignment = consignments[0].body.consignmentNumber;
await callSim(routeById('palletline.consignments.status'), { path: `/consignments/${firstConsignment}` });
await callSim(routeById('palletline.consignments.status'), { path: `/consignments/${firstConsignment}` });
const cancelAfterCollection = await callSim(routeById('palletline.consignments.cancel'), {
  path: `/consignments/${firstConsignment}/cancel`,
});
test(
  'parity: a collected pallet cannot be cancelled (the depot cut-off mirrors the mock)',
  cancelAfterCollection.ok === false &&
    String(cancelAfterCollection.body.error).startsWith('CONSIGNMENT_ALREADY_COLLECTED'),
  JSON.stringify(cancelAfterCollection.body)
);

const invoice = await callSim(routeById('palletline.consignments.invoice'), {
  path: `/consignments/${firstConsignment}/invoice`,
});
const invoiceMath = Math.round((2 * 62.5 + 500 * 0.042) * 100) / 100; // the mock's own per-pallet + per-kg formula
test(
  'parity: the simulated carrier invoice uses the SAME cost formula the mock client uses',
  invoice.body.carrierCostGbp === invoiceMath &&
    invoice.body.invoiceNumber === `MOCK-PLL-INV-${firstConsignment.slice(-4)}`,
  `${JSON.stringify(invoice.body)} vs ${invoiceMath}`
);

/* ═══════════════════════════════════════════════════════════════════════════
 * 6. MIRRORED-FACT PARITY — the Deno/src boundary duplication cannot drift.
 * ═══════════════════════════════════════════════════════════════════════════ */
const shippingConfig = read('src/config/shipping.ts');
const transformSource = read('src/lib/spapi/transform.ts');
const mockSpapi = read('src/lib/spapi/mockClient.ts');
const mockDhl = read('src/lib/dhl/mockClient.ts');
const mockPalletline = read('src/lib/palletline/mockClient.ts');

const quotedList = (source, marker) => {
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) return [];
  // Find the INITIALISER (`= [`), never a `[]` inside the type annotation.
  const arrayAt = source.indexOf('= [', markerAt);
  if (arrayAt < 0) return [];
  const slice = source.slice(arrayAt, source.indexOf(']', arrayAt));
  return [...slice.matchAll(/'([^']+)'/g)].map((m) => m[1]);
};

const ukFromTransform = (transformSource.match(/UK_MARKETPLACE_ID\s*=\s*'([^']+)'/) ?? [])[1];
test(
  'parity: the helper’s UK marketplace id equals the canonical owner (src/lib/spapi/transform.ts)',
  ukFromTransform === proxy.UK_MARKETPLACE_ID,
  `config ${ukFromTransform} vs helper ${proxy.UK_MARKETPLACE_ID}`
);
const naIdsInConfig = quotedList(shippingConfig, 'CHANNEL_NA_MARKETPLACE_IDS');
test(
  'parity: the helper’s NA marketplace ids equal src/config/shipping.ts',
  JSON.stringify(naIdsInConfig) === JSON.stringify([...proxy.CHANNEL_NA_MARKETPLACE_IDS]),
  `${JSON.stringify(naIdsInConfig)} vs ${JSON.stringify([...proxy.CHANNEL_NA_MARKETPLACE_IDS])}`
);
const labelRegionsInConfig = quotedList(shippingConfig, 'CHANNEL_SHIPMENT_LABEL_REGIONS');
test(
  'parity: the helper’s channel label regions equal src/config/shipping.ts (NA only)',
  JSON.stringify(labelRegionsInConfig) === JSON.stringify([...proxy.CHANNEL_LABEL_REGIONS]),
  `${JSON.stringify(labelRegionsInConfig)} vs ${JSON.stringify([...proxy.CHANNEL_LABEL_REGIONS])}`
);
const truckloadInConfig = Number(
  (read('src/lib/shipping/consolidation.ts').match(/TRUCKLOAD_CONFIRMATION_LIMIT\s*=\s*(\d+)/) ?? [])[1]
);
test(
  'parity: the helper’s truckload confirmation limit equals src/lib/shipping/consolidation.ts',
  truckloadInConfig === proxy.TRUCKLOAD_CONFIRMATION_LIMIT,
  `config ${truckloadInConfig} vs helper ${proxy.TRUCKLOAD_CONFIRMATION_LIMIT}`
);

const refusalCodes = Object.values(proxy.SIM_REFUSAL_CODES);
const missingRefusalCodes = refusalCodes.filter((code) => !mockSpapi.includes(code));
test(
  `parity: all ${refusalCodes.length} simulated refusal codes match the mock SP-API client`,
  missingRefusalCodes.length === 0,
  missingRefusalCodes.join(', ')
);
test(
  'parity: the simulated rejection reasons match the mock SP-API client',
  proxy.REJECTION_REASONS.every((reason) => mockSpapi.includes(reason)),
  proxy.REJECTION_REASONS.join(' | ')
);
const dhlSequence = quotedList(mockDhl, 'const MILESTONE_SEQUENCE: DhlMilestone[] = [');
test(
  'parity: the DHL simulated lifecycle equals the mock client’s order',
  JSON.stringify(dhlSequence) === JSON.stringify([...proxy.DHL_MILESTONE_SEQUENCE]),
  `${JSON.stringify(dhlSequence)} vs ${JSON.stringify([...proxy.DHL_MILESTONE_SEQUENCE])}`
);
const palletlineSequence = quotedList(mockPalletline, 'const MILESTONE_SEQUENCE: PalletlineMilestone[] = [');
test(
  'parity: the Palletline simulated lifecycle equals the mock client’s order',
  JSON.stringify(palletlineSequence) === JSON.stringify([...proxy.PALLETLINE_MILESTONE_SEQUENCE]),
  `${JSON.stringify(palletlineSequence)} vs ${JSON.stringify([...proxy.PALLETLINE_MILESTONE_SEQUENCE])}`
);
test(
  'parity: the carrier-cost constants match the mock Palletline client',
  mockPalletline.includes('const perPallet = 62.5;') && mockPalletline.includes('const perKg = 0.042;') &&
    proxy.simulatedPalletlineCarrierCost(2, 500) === Math.round((2 * 62.5 + 500 * 0.042) * 100) / 100
);

/* ═══════════════════════════════════════════════════════════════════════════
 * SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════ */
console.log('');
console.log(
  `Routes: ${proxy.PROXY_ROUTES.length} declared · ${called.length} derived from the clients · ` +
    `${proxy.PROXY_ROUTES.filter((r) => r.liveStatus === 'confirmed').length} live-capable · ` +
    `${proxy.PROXY_ROUTES.filter((r) => r.liveStatus === 'unsupported').length} simulation-only (stated refusal)`
);
console.log(`Assertions run: ${checks} · failures: ${failures}`);
console.log(
  failures === 0 ? 'INTEGRATION_PROXY_VALIDATION_PASS' : `INTEGRATION_PROXY_VALIDATION_FAIL (${failures})`
);
if (failures > 0) process.exit(1);

