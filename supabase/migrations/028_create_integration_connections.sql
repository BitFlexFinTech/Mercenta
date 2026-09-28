-- §BATCH1b — THE INTEGRATION CONNECTION RECORD.
--
-- WHY THIS EXISTS
-- ---------------
-- The Integrations Hub resolves a provider's LIVE mode from a connection record:
-- `src/integrations/connections.ts` reads `metadata.secretRef` and only returns
-- credentials when it is a `vault:<name>` reference on a non-sandbox connection.
-- Until now there was NO table behind that record (the `0002_integration_connections.sql`
-- cited in older documents NEVER EXISTED — 27 migrations, none for integration
-- connections), so a real key had nowhere durable to go and the browser's
-- localStorage was the only store.
--
-- WHAT THIS TABLE IS
--   · ONE record per provider — Mercenta's own operator accounts (Amazon Vendor
--     Central, DHL, Palletline, Xero, …), NOT brand-scoped data. That is why the
--     policies are staff-scoped and there is no tenant column: a brand never sees
--     and never owns these connections (`.clinerules/mercenta-business-model.md`
--     — Mercenta operates the Vendor Central account, a brand does not).
--   · The table holds NO SECRET. `secret_ref` is a REFERENCE only and is
--     constrained to the `vault:` scheme; the plaintext lives in Supabase Vault
--     and is read server-side only (`supabase/functions/_shared/vault.ts`).
--   · A non-sandbox (LIVE) record MUST carry a vault reference — enforced by
--     CHECK, so a "live" row without a real stored credential cannot exist.
--   · Records are RETAINED: `disconnect` changes status, and there is deliberately
--     NO delete policy (same principle as the append-only audit ledger).

CREATE TABLE IF NOT EXISTS integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'needs_attention', 'disabled')),
  sandbox boolean NOT NULL DEFAULT false,
  -- A REFERENCE, never the secret. Constrained to the vault: scheme so a
  -- plaintext credential can never be written into this column.
  secret_ref text CHECK (secret_ref IS NULL OR secret_ref LIKE 'vault:%'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  health jsonb NOT NULL DEFAULT '{"errorCount": 0}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- A LIVE connection must hold a real vault reference; a sandbox (mock) one must not.
  -- Together these also mean a simulated connect can never be stored as a live one.
  CONSTRAINT integration_connections_live_needs_vault_ref
    CHECK (sandbox OR secret_ref IS NOT NULL),
  CONSTRAINT integration_connections_sandbox_has_no_vault_ref
    CHECK (NOT sandbox OR secret_ref IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_status
  ON integration_connections(status);

ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;

-- Staff-only read: the operator control plane. No brand policy exists, by design.
CREATE POLICY "staff_read_integration_connections" ON integration_connections
  FOR SELECT
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

CREATE POLICY "staff_insert_integration_connections" ON integration_connections
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

CREATE POLICY "staff_update_integration_connections" ON integration_connections
  FOR UPDATE
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

-- NO delete policy: a connection record is retained. Disconnecting sets status.

/* ── Auto-update updated_at (same shape as migration 019) ──────────────── */

CREATE OR REPLACE FUNCTION update_integration_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_integration_connections_updated_at ON integration_connections;
CREATE TRIGGER trg_integration_connections_updated_at
  BEFORE UPDATE ON integration_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_connections_updated_at();
