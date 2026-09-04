# Mercenta Demo Deployment

This directory contains tooling for deploying the Mercenta demo to `demo.mercenta.co.uk`.

## Quick start

```bash
# 1. Create credentials file (copy the template)
cp deploy/credentials.example .env.deploy

# 2. Open .env.deploy in your editor and fill in your host's details
#    NEVER paste credentials into chat or LLM conversations

# 3. Deploy
npm run deploy
```

## Security model

- **No credentials in chat**: `.env.deploy` is gitignored. You fill it in
  using your own editor.
- **SFTP preferred**: The script tries SFTP (encrypted) first. Plain FTP is
  supported only as a documented fallback — set `DEPLOY_PROTOCOL=ftp`.
- **Template committed, secrets not**: `deploy/credentials.example` is
  committed to the repo as a template; `.env.deploy` is never committed.

## What it does

1. Builds the Vite SPA (`npm run build` → `dist/`)
2. Probes SFTP connectivity
3. Zips `dist/` (excluding `.map` files)
4. Uploads via SFTP
5. Reports next steps (manual unzip on server)

## Demo mode

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are left empty in
`.env.deploy`, the deployed demo runs in **pure mock mode** — all data comes
from the in-memory demo store, fully presentable to investors with no
external dependencies. This matches the project's mock-first policy:
Amazon/Stripe/DocuSign/etc. are all behind Mock clients until real
credentials are entered via the Integrations wizard.
