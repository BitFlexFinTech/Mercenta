#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Mercenta Self-Hosted Services Deploy Script
#
# Deploys the self-hosted services stack (Usertour, Postiz)
# to a Docker-capable VPS. Also deploys the Caddy reverse proxy config.
# Requires:
#   - SSH access to the target server (VPS provisioned via vps-bootstrap.sh)
#   - Docker + Docker Compose installed on the target
#   - .env.deploy configured with SSH_HOST, SSH_USER, SSH_KEY_PATH
#   - DNS A records pointing to the VPS IP
#
# First-time:  bash scripts/vps-bootstrap.sh  (run ONCE on the VPS)
# Deploy:      bash scripts/deploy-docker.sh
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_ENV="$PROJECT_ROOT/.env.deploy"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.services.yml"
CADDYFILE="$SCRIPT_DIR/Caddyfile"

if [[ ! -f "$DEPLOY_ENV" ]]; then
  echo "❌  $DEPLOY_ENV not found."
  echo "   cp deploy/credentials.example .env.deploy"
  exit 1
fi

if [[ ! -f "$DEPLOY_ENV" ]]; then
  echo "❌  $DEPLOY_ENV not found."
  echo "   cp deploy/credentials.example .env.deploy"
  exit 1
fi

# Load SSH credentials
set -a
while IFS='=' read -r key val || [[ -n "$key" ]]; do
  key="${key%%[[:space:]]*}"
  [[ -z "$key" || "$key" == '#'* || "$key" == 'export' ]] && continue
  val="${val##[[:space:]]}"
  val="${val%%[[:space:]]}"
  val="${val%\"}"
  val="${val#\"}"
  val="${val%\'}"
  val="${val#\'}"
  export "$key"="$val"
done < "$DEPLOY_ENV"
set +a

SSH_HOST="${SSH_HOST:-}"
SSH_USER="${SSH_USER:-}"
SSH_KEY="${SSH_KEY_PATH:-$HOME/.ssh/id_rsa}"
REMOTE_DIR="${REMOTE_SERVICES_DIR:-/opt/mercenta-services}"

if [[ -z "$SSH_HOST" || -z "$SSH_USER" ]]; then
  echo "❌  SSH credentials missing. Set SSH_HOST, SSH_USER in .env.deploy"
  echo ""
  echo "Add to .env.deploy:"
  echo "  SSH_HOST=your.vps.ip"
  echo "  SSH_USER=root"
  echo "  SSH_KEY_PATH=/path/to/your/ssh/key (optional, defaults to ~/.ssh/id_rsa)"
  echo "  REMOTE_SERVICES_DIR=/opt/mercenta-services (optional)"
  exit 1
fi

echo "🚀  Mercenta Self-Hosted Services Deploy"
echo "    Target:  $SSH_USER@$SSH_HOST"
echo "    Remote:  $REMOTE_DIR"
echo ""

# Step 1: Test SSH connection
echo "▶  Testing SSH connection..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER@$SSH_HOST" "echo '✓ SSH OK'" || {
  echo "❌  SSH connection failed. Check SSH_HOST, SSH_USER, and SSH_KEY_PATH."
  exit 1
}
echo ""

# Step 2: Check Docker on remote
echo "▶  Checking Docker on remote..."
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "command -v docker && docker --version && command -v docker-compose || command -v docker && docker compose version" || {
  echo "❌  Docker not found on remote. Install Docker first:"
  echo "    curl -fsSL https://get.docker.com | sh"
  exit 1
}
echo "✓  Docker available"
echo ""

# Step 3: Create remote directory and copy compose file
echo "▶  Setting up remote directory..."
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "mkdir -p $REMOTE_DIR"
scp -i "$SSH_KEY" "$COMPOSE_FILE" "$SSH_USER@$SSH_HOST:$REMOTE_DIR/docker-compose.services.yml"
echo "✓  docker-compose.services.yml copied"
echo ""

# Step 4: Copy .env.services if it exists (for service-specific env vars)
if [[ -f "$PROJECT_ROOT/.env.services" ]]; then
  scp -i "$SSH_KEY" "$PROJECT_ROOT/.env.services" "$SSH_USER@$SSH_HOST:$REMOTE_DIR/.env"
  echo "✓  .env.services copied as .env"
  echo ""
fi

# Step 5: Start services
echo "▶  Starting services via Docker Compose..."
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "
  cd $REMOTE_DIR
  docker compose -f docker-compose.services.yml pull
  docker compose -f docker-compose.services.yml up -d
  echo '✓ Services started'
"
echo ""

# Step 6: Check health
echo "▶  Checking service health..."
sleep 5
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "
  cd $REMOTE_DIR
  docker compose -f docker-compose.services.yml ps
"
echo ""

# Step 7: Deploy Caddy reverse proxy config
echo "▶  Deploying Caddy reverse proxy config..."
if [[ -f "$CADDYFILE" ]]; then
  scp -i "$SSH_KEY" "$CADDYFILE" "$SSH_USER@$SSH_HOST:/etc/caddy/Caddyfile"
  ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "
    systemctl reload caddy 2>/dev/null || systemctl restart caddy 2>/dev/null || echo '⚠  Caddy not running — install via vps-bootstrap.sh'
  "
  echo "✓  Caddy config deployed and reloaded"
else
  echo "⚠  Caddyfile not found at $CADDYFILE — skipping reverse proxy setup"
fi
echo ""

echo "✅  Services deployed to $SSH_USER@$SSH_HOST"
echo ""
echo "   Service        Internal URL              External URL (if configured)"
echo "   ───────        ────────────              ───────────────────────────"
echo "   Usertour       http://localhost:8090      https://usertour.mercenta.co.uk"
echo "   Postiz         http://localhost:8100      https://postiz.mercenta.co.uk"
echo ""
echo "   Next: update demo.mercenta.co.uk Integrations panel with real URLs."
echo "   Next: verify HTTPS certs: curl -I https://usertour.mercenta.co.uk"