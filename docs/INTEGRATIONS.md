# MERCENTA INTEGRATIONS

> Inventory + target architecture for every provider. Spec §4 references a
> provider/adapter architecture: DOMAIN → INTEGRATION INTERFACE → PROVIDER →
> LIVE or SIMULATION implementation.

## 1. Current registry (verified in `src/integrations/registry.ts`)

18 integrations today (Rocket.Chat removed in Phase D1, 2026-09-11 — the table
below was 15 entries when first written and is now 18 after the Phase-4 and
Priority-1 provider additions). `authMethod` = `oauth | api_key`; connect flow in
`IntegrationsContext`; live test pings in `src/lib/integrations/testCalls.ts`.

| id | Name | Auth | Live ping? | Notes |
|---|---|---|---|---|
| amazon_sp_api | Amazon Selling Partner API | oauth | no | Core PO/catalog/invoicing; OAuth consent popup configured; real calls need Edge Functions |
| amazon_ads | Amazon Ads API | oauth | no | Ad spend dashboard |
| stripe | Stripe | oauth | no | Flat monthly brand subscriptions; commission is event-driven, NOT Stripe |
| esignature | E-Signature | oauth | no | DocuSign or PandaDoc |
| email | Transactional Email | api_key | yes (Postmark/SendGrid) | `pingForService('email', 'postmark')` |
| lead_sourcing | Lead Sourcing | api_key | Apollo/Instantly (CSV = none) | CSV import is zero-API launch path |
| openrouter | OpenRouter | api_key | yes | auth/key endpoint |
| hunter | Hunter.io | api_key | yes | account read |
| instantly | Instantly.ai | api_key | yes | account list |
| keepa | Keepa API | api_key | no | product research |
| firecrawl | Firecrawl | api_key | no | discovery web fetch |
| usertour | Usertour | api_key | no | self-hosted |
| twilio_whatsapp | Twilio WhatsApp | api_key | no | escalation |
| postiz | Postiz | api_key | no | self-hosted social scheduler |

**Change log:** Rocket.Chat was removed from the registry in Phase D1
(2026-09-11) — the registry held 19 providers before, 18 now. See
`docs/PRODUCT_CONSOLIDATION_PHASED1_2026-09-11.md`.

## 2. Services with code today (beyond the registry)

- **SP-API provider trio** — `src/lib/spapi/`: `client.ts` (real, Edge
  Function transport + `secretRef`), `mockClient.ts` (identical signatures,
  deterministic states), `index.ts` (factory: mock unless verified
  non-sandbox connection with non-`mock:` secret ref). **This is the model for
  the whole provider system.**
- **Xero** — `src/services/xero/`: real OAuth v2 client, token manager, sync
  engine, 28-day demo resync, `XERO_MODE` env. The **component**
  `XeroConnection.tsx` is DEAD (syntax-broken, unimported); Xero lives in
  `AccountingPanel.tsx`.
- **Rakazo** — `RakazoPanel` iframe into self-hosted bots; `VITE_RAKAZO_URL`.
- **Supabase** — `src/lib/supabase.ts` + migrations (RLS).
- **Postmark notifier**, **WhatsApp client +
  escalation**, **Postiz client**, **Firecrawl/discovery engine**,
  **Keepa client (research)**, **OpenRouter via discovery research**,
  **Hunter variants**, **PandaDoc/esign lib**.

## 3. Environment keys (names only — values NEVER printed/logged/committed)

`SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_JWKS_URL,
SUPABASE_DB_PASSWORD, INSTANTLY_API_KEY, POSTMARK_API_KEY, HUNTER_API_KEY,
PANDADOC_API_KEY, FIRECRAWL_API_KEY, DIGITALOCEAN_API_TOKEN, XERO_CLIENT_ID,
XERO_CLIENT_SECRET, XERO_TENANT_ID, XERO_ACCESS_TOKEN, XERO_MODE,
VITE_XERO_CLIENT_ID, VITE_RAKAZO_URL, NAMECHEAP_FTP_HOST/USER/PASS/PORT,
VITE_OPENROUTER_API_KEY, VITE_HUNTER_API_KEY, VITE_INSTANTLY_API_KEY,
VITE_POSTMARK_API_KEY, VITE_SUPABASE_*`

## 4. Target integration surface (spec §2 — includes non-existent-as-fields today)

Beyond the 15 registry entries, the master spec lists: **HMRC, Companies
House, Wise Business, Payoneer, Stripe (already), DHL UK, Namecheap,
DigitalOcean, Rakazo, Supabase, Explee, LinkedIn, Facebook, Instagram,
X.com, WhatsApp Business, Google Cloud Console, GitHub** etc. Each must have a
provider entry + mode. Registry must be extended progressively (not all at
once); each gets a provider class pair (Live + Mock) satisfying the same
contract.

## 5. Mode model (target — to be implemented)

`SIMULATION | AVAILABLE/UNCONFIGURED | CONFIGURING | LIVE/CONNECTED |
DEGRADED | ERROR | DISABLED`. Stored per integration with health metadata.

## 6. Setup wizard pattern (target)

Standardized steps: Intro → Authentication → Configuration → Permissions →
Test connection → Health validation → Activate. OAuth providers use real OAuth
popup. Replaced by `IntegrationsPanel` ConnectWizard upgrade.

## 7. Secrets policy

- Never render keys/tokens/passwords/private keys in plaintext after storage.
- Report only `PRESENT` in diagnostics.
- Current reality: in-memory `apiKeyMemory` + localStorage persistence →
  `UNKNOWN — REQUIRES VERIFICATION` re: encrypted server/Vault-backed store.
  Must move to Edge Function secret storage per §14 before production.

## 8. Hybrid mode current default (documented for the demo)

| Service | Mode today | Credential? |
|---|---|---|
| DigitalOcean | LIVE (paid infra) | PRESENT |
| Postmark, Hunter, Firecrawl, PandaDoc, OpenRouter, Instantly | LIVE | PRESENT |
| Namecheap FTP | LIVE (deploy) | PRESENT |
| Xero | DEMO (28-day reset, auto-reseed) | PRESENT + MODE=demo |
| Amazon SP-API | SIMULATION | absent |
| DHL UK | SIMULATION | absent (safe mock: `mock:dhl-eu-demo-key` / `MOCK-DHL-ACCOUNT-0001`) |
| Companies House | SIMULATION | absent (safe mock: `mock:ch-demo-key`) |
| HMRC | SIMULATION | absent (safe mock: `mock:hmrc-demo-client` / `mock:hmrc-demo-secret`) |
| Stripe / Keepa | SIMULATION / UNCONFIGURED | absent |

Not a single fixed global mode — it must be per-integration and swappable by
credentials alone.

## 9. Provider Simulation-First completion (2026-09-09)

### 9.1 Architecture (proved this pass)

```
USER ACTION
→ MERCENTA DOMAIN WORKFLOW       (src/data/api.ts, src/lib/dhl/domain.ts,
                                   src/lib/compliance/complianceSync.ts — the SAME
                                   code paths for simulation and live; never a fork)
→ PROVIDER CONTRACT               (src/lib/dhl/client.ts, src/lib/compliance/*.ts,
                                   src/lib/spapi/client.ts, src/lib/billing/stripe.ts)
→ SIMULATION ADAPTER              (…/mockClient.ts)   OR   LIVE ADAPTER (…/client.ts)
   — chosen by factory (…/index.ts) from connection state ONLY
   — `mock:` secret ref is NEVER forwarded to a live transport (unit-proven)
→ PROVIDER RESPONSE / EVENT       (deterministic mock milestone/result)
→ DOMAIN PROCESSING               (mapping via transform.ts / domain.ts)
→ STATE TRANSITION                (shared demoStore arrays — every view reflects it)
→ AUDIT EVENT                     (demoAuditLog)
→ NOTIFICATION                    (eventFeed → NotificationCenter)
→ UI UPDATE
```

### 9.2 Safe mock credential rule

- Mock values are unmistakable (`mock:` prefix, `MOCK-DHL-…`, `SIM-TRK-…`),
  deterministic, never real secrets, and never sent to a live endpoint.
- An operator never invents values for simulation — the Integrations Hub
  surfaces the exact mock configuration each simulated provider uses.
- LIVE activation later is credentials-only: enter real credentials in
  Integrations; the factory returns the live client; NO domain rewrite.

### 9.3 Providers added this pass

| Provider | Contract | Simulation | Live seam | Safety gate | UI | E2E |
|---|---|---|---|---|---|---|
| **DHL UK** | `src/lib/dhl/client.ts` | `mockClient.ts` milestone machine | `createDhlClientForConnection` factory | `isProviderSimulationSafe('dhl')` at domain | Carrier terminal button | compliance-sim + simulation-control |
| **Companies House** | `companiesHouseClient.ts` | registrar mock (match/not-found/rate-limit) | factory | domain gate | Super Admin → Compliance | compliance-sim |
| **HMRC** | `hmrcClient.ts` | VAT status + filing mock (reject→retry) | factory | domain gate | Super Admin → Compliance | compliance-sim |

### 9.4 Scenario coverage (Simulation Control, Super Admin)

NORMAL_PO · PARTIAL_PO · DELAYED_DELIVERY · FINANCIAL_EXCEPTION · CASE ·
PRODUCT_FAILURE · INTEGRATION_FAILURE · **SHIPMENT_PROGRESSION** (new) ·
**COMPLIANCE_VERIFICATION** (new). All deterministic/resettable/safety-gated.

### 9.5 Live activation (exact, for GO_LIVE)

| Provider | Live credentials | Where entered | Extra code needed |
|---|---|---|---|
| Amazon SP-API | LWA Client ID + Secret + OAuth consent | Integrations → Amazon SP-API | Edge Functions `/functions/v1/spapi/*`; store refresh token as `vault:` secretRef |
| DHL | DHL Express API key + billing account | Integrations → DHL UK | EF `/functions/v1/dhl/*` |
| Companies House | free-tier API key | Integrations → Companies House | EF `/functions/v1/companies-house` |
| HMRC | MTD OAuth client id/secret + fraud headers | Integrations → HMRC | EF `/functions/v1/hmrc` |
| Xero | client id/secret + tenant | Accounting panel / XERO_MODE | none (existing) |

## 10. Canonical-model reconciliation (13 Sep)

Canonical statement: **`docs/MERCENTA_BUSINESS_MODEL.md`**. This section records
the provider-relevant changes made to match it.

### 10.1 Registry change — `palletline`

`palletline` is now a canonical registry entry
(`src/integrations/types.ts`, `src/integrations/registry.ts`) because the
shipping routing rule (§11) uses **Mercenta's Palletline account** for UK
domestic shipments. Registry count is now **19** (DHL + Palletline + Xero +
Companies House + HMRC + the original set with Rocket.Chat removed).

- `defaultMode: 'available'` — **NOT `simulation`**. There is no live *or*
  mock Palletline adapter yet, so the provider is honestly "not configured" and
  the fail-closed gate refuses a simulated Palletline provider operation.
- The **shipping economics** for a Palletline lane are computed by the domain
  (`src/lib/shipping/shippingCalculator.ts` → `computeShippingCommercials`)
  from configurable terms — that is arithmetic, **not** a provider call, and is
  never presented as a live carrier booking.

### 10.2 Carrier routing is centralised (no UI duplication)

`src/lib/shipping/carrierRouting.ts` + `src/config/shipping.ts` are the single
source of truth:

| Lane | Carrier | Mercenta account |
|---|---|---|
| International | DHL | DHL UK |
| UK domestic | Palletline | Palletline |
| Retail-channel-arranged (Freight Collect only) | partnered carrier | n/a — channel books it |

The brand ASN form and the admin on-behalf ASN form **both** read their carrier
options from this module; neither holds its own list any more.

### 10.3 Case escalation seam

`src/lib/helpdesk/amazonCaseClient.ts` is the provider seam for case
escalation, following the same mock-first/fail-closed pattern as SP-API/DHL:

| Mode | Client | Result |
|---|---|---|
| `simulation` (positively resolved) | `MockAmazonCaseClient` | deterministic `AMZ-CASE-MOCK-<hash>`, **no network**, idempotent per key |
| `live` + credentials | `RealAmazonCaseClient` | POST `${EDGE_BASE}/retail-channel/cases` with `X-Secret-Ref` + `Idempotency-Key` |
| anything else | `UnavailableAmazonCaseClient` | truthful error, **no case created**, retry-safe |

Live activation requires the `retail-channel/cases` Edge Function (holds the
secret; forwards the idempotency key) — see `PRODUCTION_READINESS.md`.

### 10.4 Live activation (unchanged additions)

| Provider | Live credentials | Where entered | Extra code needed |
|---|---|---|---|
| Palletline | Palletline account creds (API/FTP per agreement) | Integrations → Palletline | adapter following the DHL pattern; switch `defaultMode` when an adapter exists |
| Retail-channel cases | none beyond SP-API creds | Integrations → Amazon SP-API | Edge Function `/functions/v1/retail-channel/cases` |
