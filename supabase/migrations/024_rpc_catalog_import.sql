-- §Canonical model §22 — atomic catalogue-batch import RPC.
--
-- WHY: the `catalog-import` Edge Function re-validates every row server-side and
-- then must write the whole batch as ONE unit. Doing that from the function with
-- N REST inserts would be neither atomic nor safe: a failure half-way would
-- leave a partial catalogue. A single plpgsql function executed by Postgres is
-- ONE TRANSACTION — any exception aborts and rolls the entire batch back.
--
-- ⚠️ NUMBERING (honest): the production-readiness notes historically referred to
-- this file as `0010_rpc_catalog_import.sql` and the digest cron as
-- `0011_cron_daily_digest.sql`. Those numbers were already taken in this
-- repository by `010_create_compliance_docs.sql` and `011_create_messages.sql`,
-- so the files never existed under those names. The references were stale and
-- have been repointed to the real, sequential history (023 was the newest).
--
-- NON-DESTRUCTIVE: purely additive. It creates one function and does not alter
-- or drop any table created by migrations 001–023.
--
-- NOTE (honest): this migration has NOT been executed against any database in
-- the current demo environment (no browser Supabase credentials are configured
-- there). It is the durable seam for the credentialed environment.

-- Catalogue identity is (brand_id, sku): the ON CONFLICT target below. 003 only
-- indexed brand_id, so the identity is made explicit here (additive).
create unique index if not exists idx_products_brand_sku
  on public.products (brand_id, sku);

create or replace function public.import_catalog_batch(
  p_brand_id text,
  p_rows jsonb,
  p_actor text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row        jsonb;
  v_sku        text;
  v_count      int := 0;
  v_seen       text[] := array[]::text[];
begin
  if p_brand_id is null or length(trim(p_brand_id)) = 0 then
    raise exception 'unknown brand: p_brand_id is required';
  end if;

  if not exists (select 1 from public.brands b where b.id::text = p_brand_id) then
    raise exception 'unknown brand %', p_brand_id;
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'batch rejected: p_rows must be a non-empty json array';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows) as t(value)
  loop
    v_sku := nullif(trim(coalesce(v_row ->> 'sku', '')), '');

    if v_sku is null then
      raise exception 'batch rejected: a sku is required on every row';
    end if;

    -- Identity inside one batch: a repeated SKU would silently collapse two
    -- products into one, so it aborts the whole transaction.
    if v_sku = any (v_seen) then
      raise exception 'duplicate sku within batch: %', v_sku;
    end if;
    v_seen := array_append(v_seen, v_sku);

    -- Column names follow 003_create_products.sql EXACTLY (name, not title).
    insert into public.products (brand_id, sku, ean, name, category, status)
    values (
      p_brand_id::uuid,
      v_sku,
      v_row ->> 'ean',
      coalesce(nullif(trim(coalesce(v_row ->> 'title', '')), ''), v_sku),
      v_row ->> 'category',
      coalesce(nullif(trim(coalesce(v_row ->> 'status', '')), ''), 'draft')
    )
    on conflict (brand_id, sku) do update
      set ean      = excluded.ean,
          name     = excluded.name,
          category = excluded.category,
          status   = excluded.status;

    v_count := v_count + 1;
  end loop;

  -- Column names follow 015_create_audit_log.sql EXACTLY.
  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, details)
  values (
    null,
    null,
    'catalog_import_committed',
    'brand',
    p_brand_id,
    jsonb_build_object('imported', v_count, 'actor', p_actor)
  );

  return jsonb_build_object('imported', v_count, 'brandId', p_brand_id);
exception
  when others then
    -- Re-raise so the transaction ROLLS BACK in full. A partial catalogue must
    -- never survive a failed import.
    raise;
end;
$$;

comment on function public.import_catalog_batch(text, jsonb, text) is
  '§22 — atomic catalogue batch import. One transaction: any exception rolls the whole batch back.';
