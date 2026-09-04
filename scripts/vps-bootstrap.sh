#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Mercenta VPS Bootstrap Script
#
# One-time setup for a fresh Ubuntu/Debian VPS to run self-hosted
# services (Usertour, Rocket.Chat, Postiz).
#
# Usage:
#   1. Provision a VPS (DigitalOcean $12/mo, Hetzner €4.09/mo, etc.)
#   2. Point subdomains to the VPS IP:
#        usertour.mercenta.co.uk  → A record
#        chat.mercenta.co.uk       → A record
#        postiz.mercenta.co.uk     → A record
#   3. Run this script as root on the VPS:
#        wget -qO- https://raw.githubusercontent.com/.../vps-bootstrap.sh | bash
#      OR copy and run manually:
#        scp scripts/vps-bootstrap.sh root@<vps-ip>:/tmp/
#        ssh root@<vps-ip> bash /tmp/vps-bootstrap.sh
#
# Requirements: Ubuntu 22.04+ or Debian 12+, root access
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "🚀  Mercenta VPS Bootstrap"
echo "    Target: $(hostname) ($(uname -m))"
echo "    Date:   $(date -u '+%Y-%m-%d %H:%M UTC')"
echo ""

# ── Step 1: System update ───────────────────────────────────────────
echo "▶  Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
echo "✓  System updated"
echo ""

# ── Step 2: Install Docker ──────────────────────────────────────────
echo "▶  Installing Docker..."
if command -v docker &>/dev/null; then
  echo "✓  Docker already installed ($(docker --version))"
else
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "✓  Docker installed ($(docker --version))"
fi
echo ""

# ── Step 3: Install Docker Compose plugin ───────────────────────────
echo "▶  Installing Docker Compose..."
if docker compose version &>/dev/null; then
  echo "✓  Docker Compose already installed ($(docker compose version))"
else
  apt-get install -y -qq docker-compose-plugin
  echo "✓  Docker Compose installed ($(docker compose version))"
fi
echo ""

# ── Step 4: Install Caddy (reverse proxy + TLS) ─────────────────────
echo "▶  Installing Caddy reverse proxy..."
if command -v caddy &>/dev/null; then
  echo "✓  Caddy already installed ($(caddy version))"
else
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
  echo "✓  Caddy installed ($(caddy version))"
fi
echo ""

# ── Step 5: Create service directories ──────────────────────────────
echo "▶  Creating service directories..."
mkdir -p /opt/mercenta-services
mkdir -p /etc/caddy
echo "✓  Directories created:"
echo "    /opt/mercenta-services/  — Docker Compose + service data"
echo "    /etc/caddy/              — Caddy configuration"
echo ""

# ── Step 6: Configure firewall ──────────────────────────────────────
echo "▶  Configuring firewall..."
if command -v ufw &>/dev/null; then
  ufw allow 22/tcp    # SSH
  ufw allow 80/tcp    # HTTP (Caddy auto-redirects to HTTPS)
  ufw allow 443/tcp   # HTTPS
  ufw --force enable 2>/dev/null || true
  echo "✓  UFW enabled — ports 22, 80, 443 open"
else
  echo "⚠  UFW not found. Manually ensure ports 22, 80, 443 are open."
fi
echo ""

# ── Step 7: Create systemd override for Docker (optional, performance) ─
echo "▶  Optimizing Docker daemon..."
if [[ ! -f /etc/docker/daemon.json ]]; then
  cat > /etc/docker/daemon.json << 'DOCKERCONF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
DOCKERCONF
  systemctl restart docker
  echo "✓  Docker optimized (log rotation, overlay2)"
else
  echo "✓  Docker already configured"
fi
echo ""

# ── Summary ──────────────────────────────────────────────────────────
IP=$(curl -4 -s ifconfig.me 2>/dev/null || echo "unknown")
echo "══════════════════════════════════════════════════════════════════"
echo "  ✅  VPS bootstrap complete!"
echo ""
echo "  VPS IP:        $IP"
echo "  Hostname:      $(hostname)"
echo "  Docker:        $(docker --version)"
echo "  Compose:       $(docker compose version)"
echo "  Caddy:         $(caddy version)"
echo ""
echo "  ── Next steps ──"
echo "  1. Configure DNS:"
echo "     usertour.mercenta.co.uk  → A  $IP"
echo "     chat.mercenta.co.uk       → A  $IP"
echo "     postiz.mercenta.co.uk     → A  $IP"
echo ""
echo "  2. Deploy services from local machine:"
echo "     bash scripts/deploy-docker.sh"
echo ""
echo "  3. Verify Caddy auto-provisions HTTPS certificates"
echo "     sudo journalctl -u caddy --no-pager -n 50"
echo ""
echo "  4. Open the Integrations panel on demo.mercenta.co.uk"
echo "     and update service URLs with real endpoints."
echo "══════════════════════════════════════════════════════════════════"