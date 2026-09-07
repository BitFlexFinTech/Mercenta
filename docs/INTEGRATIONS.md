# MERCENTA INTEGRATIONS

> Inventory + target architecture for every provider. Spec §4 references a
> provider/adapter architecture: DOMAIN → INTEGRATION INTERFACE → PROVIDER →
> LIVE or SIMULATION implementation.

## 1. Current registry (verified in `src/integrations/registry.ts`)

15 integrations today. `authMethod` = `oauth | api_key`; connect flow in
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
| rocketchat | Rocket.Chat | api_key | no | self-hosted SSO messaging |
| twilio_whatsapp | Twilio WhatsApp | api_key | no | escalation |
| postiz | Postiz | api_key | no | self-hosted social scheduler |

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
- **Postmark notifier**, **Rocket.Chat client/SSO**, **WhatsApp client +
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
| Stripe / DHL / Keepa / Companies House / HMRC | SIMULATION / UNCONFIGURED | absent |

Not a single fixed global mode — it must be per-integration and swappable by
credentials alone.