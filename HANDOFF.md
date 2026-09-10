---
# HANDOFF DOCUMENT — Mercenta Partners Platform Build
Last updated: September 10, 2026 (Phase B — Brand Intelligence lifecycle)

## WHO I AM:
I'm Tadii. NOT technical. I use Cline to build Mercenta Partners Ltd
(a UK B2B distribution platform). The AI assistant gives me ONE short
prompt at a time. I paste it into Cline (new chat, Act mode). I paste
Cline's output back. AI confirms, gives next prompt.

## CRITICAL WORKFLOW RULES:
1. ONE TASK PER CLINE CHAT. Never combine tasks.
2. ACT MODE only.
3. Prompts must be SHORT and FOCUSED. Never a 200-line mega-prompt.
4. Every prompt ends with: no styling changes, no demo data deletion,
   no commit unless I say so, show git diff --stat, run build, run
   e2e tests, run zip script.
5. If Cline asks a question, I paste it to AI. AI tells me what to answer.
6. If Cline tries to do extra, I say "Stop."
7. Commit before starting new work.
8. If AI makes a mega-prompt, I say: "No. One task. Short prompt."

## WHAT'S BUILT:
- React/TS/Vite frontend (161 files)
- Supabase (142.93.46.155) — 14 tables + RLS
- 20 Rakazo bots (24.144.86.50) — all demo mode
- Services (46.101.75.185) — Rocket.Chat, Usertour, Postiz
- Playwright suite (156 passing tests, 24 spec files)
- Homepage: "Your brand. The UK market." (NO Amazon mention)
- Partner Login + application gate + link verification
- Legal agreements 4.1 + 4.2 in onboarding
- 9 Usertours
- PO email + auto-shipment + label/ASN stubs
- Penny Pincher (7am, real API data, USD)
- Margaret (6:30am, UK accountant)
- Xero integration (28-day reset, auto-reseed)
- Brand Intelligence REAL-DATA LIFECYCLE (Phase B, 2026-09-10): canonical
  prospect store (12 tracked / 10 active), Admin "Run discovery" + run history,
  candidate de-duplication, disqualify/re-qualify with audit history,
  per-prospect History timeline. Tapatío, Seep, Astonish, Fly By Jing,
  LocknLock, Mike's Hot Honey, Cholula, Valentina, Delphis Eco, Kit & Kin.
- Review zip script + protection rules + handoff rule

## WHAT'S LEFT (IN ORDER):
NOTE: Development follows the MASTER CONSOLIDATION ROADMAP in
PROJECT_STATUS.md — CORE PRODUCT FIRST, RAKAZO LAST. Rakazo is deliberately
the FINAL phase. The older list below is superseded by that roadmap.
1. [DONE in roadmap] Rakazo iframe in Super Admin — exists; Rakazo bots + real
   workforce integration = FINAL phase (M), NOT current.
2. Namecheap FTP deploy script — DONE (scripts/deploy-demo.sh; demo live).
3. Companies House + HMRC compliance dashboard — DONE (simulation-complete).
4. GO_LIVE.md playbook — pending (production go-live after roadmap).
NEXT in roadmap: Phase C — ICP consumes the canonical BI prospects (replaces
the old mock lead universe with the real Tapatío-style prospects), then
outreach preparation → human approval → send/track → opportunity → CRM.

## API KEYS:
HAVE: DO, Postmark, Hunter, Firecrawl, PandaDoc, OpenRouter,
Instantly, Namecheap FTP (all in .env)

WAITING: Amazon SP-API, DHL, Stripe, Xero (sign up now),
Companies House (sign up now), HMRC (few days), Keepa (paid)

## DROPLETS (3, $60/mo):
- mercenta-supabase-demo (142.93.46.155, 2GB, London)
- mercenta-services (46.101.75.185, 4GB, London)
- mercenta-agents-v2 (24.144.86.50, 4GB, SF)
SSH: ~/.ssh/id_ed25519 (Rakazo), ~/.ssh/mercenta_do_id_rsa (Services)

## BOTS (20, demo mode):
Adam, Jess, Marcus, Priya, Kwame (African/Asian, free tools),
Sofia, Elena, Diego (PAUSED), Noor, Leo, Wei, Ava, Ravi, Freya,
Omar, Ingrid, Zara (draft only), Penny Pincher (7am), Margaret (6:30am)

## BUSINESS RULES:
- Public: "UK market" / "UK retail channels" ONLY
- NEVER public: Amazon, Vendor Central, 1P, VaaS
- Internal: "UK Market-as-a-Service"
- 10 categories, African/Asian focus, embassy angle
- Direct + Financed fulfillment

## COMPANY:
- Mercenta Partners Ltd — 1st Formations, waiting on ID verification
- Sole director/shareholder/PSC
- SIC: 46900, 46190, 62012, 52290
- Registered office: London. Residential: Harare, Zimbabwe

## CURRENT STATE:
- demo.mercenta.co.uk = FROZEN (Aug 31)
- Local code = current
- npm run preview = correct version
- Deploy script = NOT YET CREATED

## HOW TO USE THIS DOC:
1. Paste into new AI chat as first message
2. Say: "Continue. I'm on [task]. Give me next prompt."
3. AI gives ONE short prompt. Paste into Cline. Paste output back.
4. NEVER combine prompts. NEVER mega-prompts.
5. Say "Provide Handoff" to Cline to auto-update this file.

---

## EXACT PROMPTS BELOW — Do NOT reword, do NOT combine.

### PROMPT: Rakazo Iframe
This is a Super Admin panel integration task.
Goal: Add a "Bot Workforce" tab that embeds the Rakazo web UI.
1. In SuperAdminPanel.tsx, add tab "Bot Workforce" (after "Accounting").
2. Full-height iframe: src https://24-144-86-50.sslip.io, width 100%,
   height calc(100vh - 120px), border none,
   sandbox "allow-scripts allow-same-origin allow-forms allow-popups"
3. Toolbar: "Open in new tab", "Refresh", green/red status dot.
4. Constant: export const RAKAZO_URL = 'https://24-144-86-50.sslip.io';
5. Do NOT change other tabs.
Rules: No styling changes. No demo data deletion. No commit unless
I say so. Show git diff --stat. Run npm run build. Run relevant e2e.
Run zip script.
### PROMPT: Namecheap FTP Deploy
This is a deploy-to-Namecheap automation task.
Part 1: Add to .env: NAMECHEAP_FTP_HOST: ftp.demo.mercenta.co.uk,
NAMECHEAP_FTP_USER: demo@demo.mercenta.co.uk,
NAMECHEAP_FTP_PASS: ^LV#?4Lh-hzFEi5Q, NAMECHEAP_FTP_PORT: 21
Part 2: Create scripts/deploy-demo.sh:
#!/bin/bash
set -e
echo "Building..."
cd ~/Desktop/Mercenta
npm run build
echo "Deploying..."
source .env
lftp -u "$NAMECHEAP_FTP_USER,$NAMECHEAP_FTP_PASS" -p
"$NAMECHEAP_FTP_PORT" "$NAMECHEAP_FTP_HOST" <<EOF
cd /
mirror -R --delete dist/ .
EOF
echo "Done. Check: https://demo.mercenta.co.uk"
chmod +x scripts/deploy-demo.sh
Part 3: Test it. Confirm live.
Part 4: Add to protection-rules.md: "Do NOT deploy unless I say
'deploy'. Only demo.mercenta.co.uk."
Rules: No source file changes. No commit unless I say so. Show
deploy output. Run zip script.

### PROMPT: CH + HMRC Compliance
This is a compliance dashboard task.
Goal: Add "Compliance" tab to Super Admin (after "Accounting").
Part 1: Create src/lib/compliance/companiesHouseClient.ts
  (Real: api.company-information.service.gov.uk, Basic Auth.
   Mock: "CH not connected")
Part 2: Create src/lib/compliance/hmrcClient.ts
  (Real: api.service.hmrc.gov.uk, OAuth Bearer + fraud headers.
   Mock: "HMRC not connected")
Part 3: Create src/lib/compliance/complianceSync.ts
  (getComplianceDashboard, fileNow)
Part 4: Add to .env: CH_API_KEY, CH_COMPANY_NUMBER, CH_AUTH_CODE,
  HMRC_CLIENT_ID, HMRC_CLIENT_SECRET, HMRC_MODE: demo
Part 5: Super Admin tab: CH status + CS deadline + filing history.
  HMRC VAT status + next deadline + CT deadline. Deadline tracker
  (90 days, amber <14). "Sync Now" + "File" buttons (disabled demo).
Part 6: Update Margaret + Adam instructions on droplet.
Part 7: e2e/compliance.spec.ts (5 tests: not connected, placeholders,
  sync error, file disabled, history empty)
Rules: No styling. No demo data. Demo mode graceful. No commit
unless I say so. Show diff. Build. E2E. Zip.

### PROMPT: GO_LIVE.md Playbook
This is a go-live playbook creation task.
Create ~/Desktop/Mercenta/GO_LIVE.md with:

# GO LIVE PLAYBOOK
Trigger: Adam receives "Let's go live" → reads this → instructs
Ravi (items 1-8), Ava (item 11), Adam handles 9-12, item 13 verify.

PREREQUISITES (if ANY missing, STOP and report which):
Amazon SP-API (LWA ID + Secret)
DHL Enterprise (API Key + Account)
Stripe (Publishable + Secret)
Xero (Client ID + Secret + Tenant ID)
Keepa (API Key)
Companies House (API Key + Company Number + Auth Code)
HMRC (Client ID + Secret + GG creds)
All brands approved. All tests passing. RLS verified.

ITEMS:
1. SP-API: replace mock, create Edge Functions (auth, poll 15min, ship)
2. DHL: replace label stub, create dhlClient.ts, POST /shipments/v4
3. Stripe: replace mock, wire subscriptions + payouts
4. PandaDoc: replace signing stub, POST /v1/envelopes, webhook
5. Xero: connect, XERO_MODE=production, full reseed
6. Keepa: replace mock research
7. PO cron: */15 * * * *
8. Postiz: re-add Temporal, resize 8GB, Zara DRAFT→SCHEDULED
9. Diego: unpause outreach
10. Remove demo mode from all 20 bots
11. CTA: "See if your brand qualifies" → "Start your onboarding"
12. Deploy to mercenta.co.uk
13. Verify: all tests, build, all flows, Penny/Margaret/Adam live

EXECUTION: 1-8 Ravi, 11 Ava, 9-10 Adam, 12 Adam, 13 All. 4-6 hrs.

Then: Update Adam + Ravi instructions on droplet with GO LIVE
trigger/execution sections. Copy GO_LIVE.md to /srv/rakazo/.
Verify all files exist.
Rules: Do NOT implement go-live items. Only create file. No commit.
Run zip script.
---