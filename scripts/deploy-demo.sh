#!/bin/bash
set -e
echo "Building..."
# Resolve the project root from this script's own location (the folder was
# renamed from ~/Desktop/Mercenta to "/Users/tadii/Desktop/1. Mercenta").
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"
npm run build

echo "Deploying..."
# Read FTP vars directly (avoids shell-interpretation issues with .env)
NAMECHEAP_FTP_HOST=$(grep '^NAMECHEAP_FTP_HOST=' .env | cut -d= -f2-)
NAMECHEAP_FTP_USER=$(grep '^NAMECHEAP_FTP_USER=' .env | cut -d= -f2-)
NAMECHEAP_FTP_PASS=$(grep '^NAMECHEAP_FTP_PASS=' .env | cut -d= -f2-)
NAMECHEAP_FTP_PORT=$(grep '^NAMECHEAP_FTP_PORT=' .env | cut -d= -f2-)

# §BATCH 5 (2026-10-10) — SECURITY FIX AT SOURCE. This used to run
# `lftp -u "user,password" …`, which puts the FTP PASSWORD in the process table,
# where ANY other process on the machine can read it with `ps` (it was observed
# there during a deploy). The credentials now go into a mode-600 lftp SCRIPT FILE
# instead, and the file is deleted as soon as lftp exits.
LFTP_RC="$(mktemp)"
chmod 600 "$LFTP_RC"
trap 'rm -f "$LFTP_RC"' EXIT
{
  printf 'set ftp:ssl-allow true\n'
  printf 'set ssl:verify-certificate no\n'
  printf 'open -u %s,%s -p %s %s\n' "$NAMECHEAP_FTP_USER" "$NAMECHEAP_FTP_PASS" "$NAMECHEAP_FTP_PORT" "$NAMECHEAP_FTP_HOST"
  printf 'mirror -R --delete dist/ .\n'
  printf 'quit\n'
} > "$LFTP_RC"

lftp -f "$LFTP_RC"
echo "Done. Check: https://demo.mercenta.co.uk"