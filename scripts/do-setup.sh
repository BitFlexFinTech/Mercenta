#!/usr/bin/env bash
set -euo pipefail

DO_TOKEN="dop_v1_845ed63734bbd3fe4d89bdf5004a49f5c92b75bbbeedf4eb38e3f8a69e4df224"
SSH_KEY_PATH="$HOME/.ssh/mercenta_do_id_rsa"
SSH_PUB_PATH="$SSH_KEY_PATH.pub"

echo "=== 1. Adding SSH key to DO ==="
PUBKEY=$(cat "$SSH_PUB_PATH")
KEY_RESPONSE=$(curl -s -X POST "https://api.digitalocean.com/v2/account/keys" \
  -H "Authorization: Bearer $DO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"mercenta-demo-key\",\"public_key\":\"$PUBKEY\"}")
echo "$KEY_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print('SSH Key ID:', d.get('ssh_key',{}).get('id', 'FAILED'))"
KEY_ID=$(echo "$KEY_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ssh_key',{}).get('id', ''))")

if [ -z "$KEY_ID" ]; then
  echo "SSH key may already exist. Fetching existing key id..."
  KEY_ID=$(curl -s "https://api.digitalocean.com/v2/account/keys" \
    -H "Authorization: Bearer $DO_TOKEN" \
    | python3 -c "import sys,json; keys=json.load(sys.stdin).get('ssh_keys',[]); print(next((k['id'] for k in keys if 'mercenta' in k['name']),''))")
  echo "Existing SSH Key ID: $KEY_ID"
fi

echo ""
echo "=== 2. Getting available regions ==="
REGIONS=$(curl -s "https://api.digitalocean.com/v2/regions" -H "Authorization: Bearer $DO_TOKEN" \
  | python3 -c "import sys,json; rs=[r['slug'] for r in json.load(sys.stdin).get('regions',[]) if r['available'] and 'lon' in r['slug']]; print(rs[0] if rs else 'nyc1')")
echo "Region: $REGIONS"

echo ""
echo "=== 3. Creating droplet (s-1vcpu-1gb, 25GB SSD) ==="
DROPLET_RESPONSE=$(curl -s -X POST "https://api.digitalocean.com/v2/droplets" \
  -H "Authorization: Bearer $DO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"mercenta-supabase-demo\",
    \"region\": \"$REGIONS\",
    \"size\": \"s-1vcpu-1gb\",
    \"image\": \"docker-20-04\",
    \"ssh_keys\": [$KEY_ID],
    \"backups\": false,
    \"ipv6\": true,
    \"monitoring\": true,
    \"user_data\": \"\",
    \"tags\": [\"mercenta\", \"supabase\", \"demo\"]
  }")
DROPLET_ID=$(echo "$DROPLET_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('droplet',{}).get('id','FAILED'))")
echo "Droplet ID: $DROPLET_ID"

echo ""
echo "=== 4. Waiting for droplet to provision (up to 60s) ==="
for i in $(seq 1 30); do
  sleep 10
  IP=$(curl -s "https://api.digitalocean.com/v2/droplets/$DROPLET_ID" \
    -H "Authorization: Bearer $DO_TOKEN" \
    | python3 -c "import sys,json; d=json.load(sys.stdin).get('droplet',{}); nets=d.get('networks',{}).get('v4',[]); print(next((n['ip_address'] for n in nets if n['type']=='public'),'WAITING'))")
  if [ "$IP" != "WAITING" ]; then
    echo "Droplet IP: $IP"
    echo "$IP" > /tmp/mercenta_droplet_ip.txt
    break
  fi
  echo "  Attempt $i/30 - still provisioning..."
done

IP=$(cat /tmp/mercenta_droplet_ip.txt 2>/dev/null || echo "")
if [ -z "$IP" ]; then
  echo "ERROR: Droplet did not get an IP in time"
  exit 1
fi

echo ""
echo "=== 5. Waiting for SSH to become available ==="
for i in $(seq 1 20); do
  sleep 10
  if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i "$SSH_KEY_PATH" root@$IP "echo READY" 2>/dev/null; then
    echo "SSH ready!"
    break
  fi
  echo "  Attempt $i/20 - waiting for SSH..."
done

echo ""
echo "=== 6. Setting up Docker + Supabase on droplet ==="
scp -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" /dev/null root@$IP:/tmp/ready 2>/dev/null || true

# Write a setup script to the droplet
cat > /tmp/supabase-setup.sh << 'SUPABASE_SETUP'
set -euo pipefail
cd /root

# Install docker-compose if needed
if ! command -v docker-compose &>/dev/null; then
  apt-get update -qq
  apt-get install -y -qq docker-compose-plugin git curl 2>&1 | tail -3
fi

# Clone Supabase self-hosted
git clone --depth 1 https://github.com/supabase/supabase /root/supabase 2>&1 | tail -3
cd /root/supabase

# Copy the default env and start
cp .env.example .env

# Generate secure keys
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 32)/" .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 64)/" .env
sed -i "s/ANON_KEY=.*/ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjk5OTk5OTk5OTl9.some-anon-key-placeholder/" .env
sed -i "s/SERVICE_ROLE_KEY=.*/SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6OTk5OTk5OTk5OX0.some-service-role-key-placeholder/" .env

# Start Supabase stack
docker compose up -d 2>&1 | tail -10

# Wait for it to be healthy
echo "Waiting for Supabase to become healthy..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8000/health >/dev/null 2>&1; then
    echo "Supabase is healthy!"
    break
  fi
  sleep 5
  echo "  Attempt $i/30..."
done

# Print the connection details
echo ""
echo "=== SUPABASE CONNECTION DETAILS ==="
echo "URL: http://$(curl -s http://checkip.amazonaws.com):8000"
echo "ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjk5OTk5OTk5OTl9.some-anon-key-placeholder"
SUPABASE_SETUP

scp -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" /tmp/supabase-setup.sh root@$IP:/root/
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@$IP "bash /root/supabase-setup.sh" 2>&1

echo ""
echo "=== DONE ==="
echo "Droplet IP: $IP"
echo "SSH key: $SSH_KEY_PATH"