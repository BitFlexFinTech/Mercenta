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

lftp -u "$NAMECHEAP_FTP_USER,$NAMECHEAP_FTP_PASS" -p "$NAMECHEAP_FTP_PORT" "$NAMECHEAP_FTP_HOST" -e "set ftp:ssl-allow true; set ssl:verify-certificate no; mirror -R --delete dist/ .; quit"
echo "Done. Check: https://demo.mercenta.co.uk"