#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Mercenta Demo Deploy Script
# Usage:  npm run deploy
#
# Reads credentials from .env.deploy (NOT committed — edit manually).
# Prefers SFTP (encrypted). Falls back to FTP only if SFTP is unavailable
# or DEPLOY_PROTOCOL=ftp is set.
# NEVER paste credentials into chat — fill .env.deploy in your editor.
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Locate project root ──────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_ENV="$PROJECT_ROOT/.env.deploy"

if [[ ! -f "$DEPLOY_ENV" ]]; then
  echo "❌  $DEPLOY_ENV not found."
  echo "   cp deploy/credentials.example .env.deploy"
  echo "   Then open .env.deploy in your editor and fill in credentials."
  exit 1
fi

# ── Load credentials (safe: handles # and other special chars in values) ─
# We read line by line instead of using 'source' which treats # as comments.
set -a
while IFS='=' read -r key val || [[ -n "$key" ]]; do
  # Strip whitespace, skip comments/empties
  key="${key%%[[:space:]]*}"
  [[ -z "$key" || "$key" == '#'* || "$key" == 'export' ]] && continue
  # Strip leading/trailing whitespace from val
  val="${val##[[:space:]]}"
  val="${val%%[[:space:]]}"
  # Remove surrounding quotes if present
  val="${val%\"}"
  val="${val#\"}"
  val="${val%\'}"
  val="${val#\'}"
  export "$key"="$val"
done < "$DEPLOY_ENV"
set +a

# ── Validate required fields ───────────────────────────────────────────
PROTOCOL="${DEPLOY_PROTOCOL:-sftp}"
REMOTE_PATH="${SFTP_REMOTE_PATH:-/}"
PORT="${SFTP_PORT:-22}"
HOST=""
USER=""
PASS=""

if [[ "$PROTOCOL" == "sftp" ]]; then
  HOST="${SFTP_HOST:-}"
  USER="${SFTP_USER:-}"
  PASS="${SFTP_PASSWORD:-}"
  if [[ -z "$HOST" || -z "$USER" || -z "$PASS" ]]; then
    echo "❌  SFTP credentials missing. Fill SFTP_HOST, SFTP_USER, SFTP_PASSWORD in .env.deploy"
    exit 1
  fi
else
  HOST="${FTP_HOST:-}"
  USER="${FTP_USER:-}"
  PASS="${FTP_PASSWORD:-}"
  PORT="${FTP_PORT:-21}"
  REMOTE_PATH="${FTP_REMOTE_PATH:-/}"
  if [[ -z "$HOST" || -z "$USER" || -z "$PASS" ]]; then
    echo "❌  FTP credentials missing. Fill FTP_HOST, FTP_USER, FTP_PASSWORD in .env.deploy"
    exit 1
  fi
fi

if [[ -z "$DEPLOY_DOMAIN" ]]; then
  echo "❌  DEPLOY_DOMAIN is empty in .env.deploy"
  exit 1
fi

echo "🚀  Mercenta demo deploy"
echo "    Protocol:  $PROTOCOL"
echo "    Host:      $HOST"
echo "    User:      $USER"
echo "    Remote:    $REMOTE_PATH"
echo "    Domain:    $DEPLOY_DOMAIN"
echo ""

# ── Step 1: Build ────────────────────────────────────────────────────
echo "▶  Building (npm run build)..."
( cd "$PROJECT_ROOT" && npm run build )
echo "✓  Build complete. dist/ size:"
du -sh "$PROJECT_ROOT/dist"
echo ""

# ── Step 2: Check SFTP support ──────────────────────────────────────
SSHPASS_BIN=""
if [[ "$PROTOCOL" == "sftp" ]]; then
  SSH_PASS="$(command -v sshpass 2>/dev/null)"
  if [[ -n "$SSH_PASS" ]]; then
    SSHPASS_BIN="$SSH_PASS"
  else
    echo "⚠  sshpass not found. Cannot do non-interactive SFTP."
    echo "   Install it: brew install sshpass (macOS) or apt-get install sshpass (Linux)"
    echo "   Falling back to FTP..."
    PROTOCOL="ftp"
    HOST="${FTP_HOST}"
    PORT="${FTP_PORT:-21}"
    USER="${FTP_USER}"
    PASS="${FTP_PASSWORD}"
    REMOTE_PATH="${FTP_REMOTE_PATH:-/}"
  fi
fi

if [[ "$PROTOCOL" == "sftp" ]]; then
  echo "▶  Probing SFTP connectivity to $HOST:$PORT ..."
  if echo "ls" | ${SSHPASS_BIN} -p "${PASS}" sftp -o "StrictHostKeyChecking=no" -P "$PORT" "${USER}@${HOST}" 2>&1 | grep -q "sftp>"; then
    echo "✓  SFTP connection to $HOST established."
  else
    echo "⚠  SFTP probe failed. Falling back to FTP (unencrypted)..."
    PROTOCOL="ftp"
    HOST="${FTP_HOST}"
    PORT="${FTP_PORT:-21}"
    USER="${FTP_USER}"
    PASS="${FTP_PASSWORD}"
    REMOTE_PATH="${FTP_REMOTE_PATH:-/}"
  fi
  echo ""
fi

# ── Step 3: Package dist/ ────────────────────────────────────────────
ARCHIVE="$PROJECT_ROOT/mercenta-demo-deploy.zip"
echo "▶  Packaging dist/ into $(basename "$ARCHIVE") ..."
rm -f "$ARCHIVE"
( cd "$PROJECT_ROOT" && zip -r "$ARCHIVE" dist/ -x "*.map" )
echo "✓  Archive created $(du -sh "$ARCHIVE" | cut -f1)"
echo ""

# ── Step 4: Upload ───────────────────────────────────────────────────
REMOTE_FILE="$REMOTE_PATH/mercenta-demo-deploy.zip"

if [[ "$PROTOCOL" == "sftp" ]]; then
  echo "▶  Uploading via SFTP to $HOST:$PORT..."
  ${SSHPASS_BIN} -p "${PASS}" sftp -o "StrictHostKeyChecking=no" -P "${PORT}" "${USER}@${HOST}" <<SFTP_EOF
put "$ARCHIVE" "$REMOTE_FILE"
bye
SFTP_EOF
  echo "✓  Upload complete via SFTP."
  echo "  Remote: $REMOTE_FILE"
else
  echo "▶  Uploading via FTP to $HOST:$PORT..."
  curl --ftp-create-dirs \
    -T "$ARCHIVE" \
    --user "${USER}:${PASS}" \
    "ftp://${HOST}:${PORT}${REMOTE_PATH}/mercenta-demo-deploy.zip"
  echo "✓  Upload complete via FTP."
fi
echo ""

# ── Step 5: Cleanup local archive ────────────────────────────────────
rm -f "$ARCHIVE"
echo "✓  Local archive cleaned up."
echo ""

echo "✅  Deploy finished. Next steps:"
echo "    1. On the server, extract the archive:"
echo "       unzip -o $REMOTE_FILE -d $REMOTE_PATH"
echo "    2. Verify https://$DEPLOY_DOMAIN loads."
echo "    3. Test core demo flows: brand login, PO acknowledgment, admin dashboard."
echo ""
if [[ -n "${VITE_SUPABASE_URL:-}" && -n "${VITE_SUPABASE_ANON_KEY:-}" ]]; then
  echo "    ⚠  Supabase env vars were baked into the build at deploy time."
  echo "       Ensure the values in .env.deploy match your Supabase project."
else
  echo "    ℹ  No Supabase credentials — demo runs in pure mock mode (in-memory data)."
fi
