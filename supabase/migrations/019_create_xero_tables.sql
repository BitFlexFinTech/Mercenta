-- §Xero Integration — Xero accounting sync tables
-- xero_connections: OAuth token + tenant binding per partner
-- xero_sync_log: audit trail of every Xero API operation

/* ── xero_connections ─────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS xero_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  xero_tenant_id text NOT NULL,
  access_token text NOT NULL DEFAULT '',     -- encrypted at rest (app-level or PGSQL pgcrypto)
  refresh_token text NOT NULL DEFAULT '',    -- encrypted at rest
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  last_reset_at timestamptz,                -- tracks the 28-day full-resync cycle
  status text NOT NULL DEFAULT 'needs_reauth'
    CHECK (status IN ('active', 'needs_reauth', 'disconnected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xero_connections_partner_id ON xero_connections(partner_id);
CREATE INDEX IF NOT EXISTS idx_xero_connections_status ON xero_connections(status);

ALTER TABLE xero_connections ENABLE ROW LEVEL SECURITY;

-- Partner can read/update only their own connection
CREATE POLICY "partner_own_xero_connection" ON xero_connections
  FOR ALL
  USING (partner_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Super Admin can manage all connections
CREATE POLICY "super_admin_all_xero_connections" ON xero_connections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM brands b
      WHERE b.id = xero_connections.partner_id
        AND (auth.jwt() ->> 'role') = 'super_admin'
    )
  );

/* ── xero_sync_log ────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS xero_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  operation text NOT NULL
    CHECK (operation IN ('invoice_push', 'contact_sync', 'full_resync', 'token_refresh')),
  records_affected int NOT NULL DEFAULT 0,
  success bool NOT NULL DEFAULT true,
  error_message text,
  api_calls_used int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xero_sync_log_partner ON xero_sync_log(partner_id);
CREATE INDEX IF NOT EXISTS idx_xero_sync_log_created ON xero_sync_log(created_at DESC);

ALTER TABLE xero_sync_log ENABLE ROW LEVEL SECURITY;

-- Partner can see their own sync log
CREATE POLICY "partner_own_xero_sync_log" ON xero_sync_log
  FOR SELECT
  USING (partner_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Super Admin can see and insert all sync logs
CREATE POLICY "super_admin_all_xero_sync_log" ON xero_sync_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM brands b
      WHERE b.id = xero_sync_log.partner_id
        AND (auth.jwt() ->> 'role') = 'super_admin'
    )
  );

-- Any authenticated service can insert (for Edge Function writes)
CREATE POLICY "service_can_insert_xero_sync_log" ON xero_sync_log
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() IS NULL);

/* ── Auto-update updated_at on xero_connections ──────────────────────── */

CREATE OR REPLACE FUNCTION update_xero_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_xero_connections_updated_at ON xero_connections;
CREATE TRIGGER trg_xero_connections_updated_at
  BEFORE UPDATE ON xero_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_xero_connections_updated_at();