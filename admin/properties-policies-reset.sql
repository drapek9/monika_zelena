-- =============================================================================
-- RESET RLS politik pro tabulku properties (stav: status)
-- Spusťte celý soubor v Supabase SQL Editoru (jednorázově).
-- =============================================================================

alter table public.properties enable row level security;

-- Smazat VŠECHNY existující politiky na properties (včetně starých se sold)
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'properties'
  loop
    execute format('drop policy if exists %I on public.properties', pol.policyname);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Veřejnost (anon) – pouze čtení pro web
-- -----------------------------------------------------------------------------

-- Aktuální nabídka: aktivní + rezervované
create policy "Public read listed properties"
  on public.properties
  for select
  to anon
  using (status in ('active', 'reserved'));

-- Sekce Prodáno na webu
create policy "Public read sold properties"
  on public.properties
  for select
  to anon
  using (status = 'sold');

-- -----------------------------------------------------------------------------
-- Admin (authenticated) – plný přístup
-- -----------------------------------------------------------------------------

create policy "properties_select_authenticated"
  on public.properties
  for select
  to authenticated
  using (true);

create policy "properties_insert_authenticated"
  on public.properties
  for insert
  to authenticated
  with check (true);

create policy "properties_update_authenticated"
  on public.properties
  for update
  to authenticated
  using (true)
  with check (true);

create policy "properties_delete_authenticated"
  on public.properties
  for delete
  to authenticated
  using (true);

-- =============================================================================
-- Po spuštění byste měli mít přesně 6 politik na public.properties:
--
-- | Politika                         | Role           | Operace | Podmínka              |
-- |----------------------------------|----------------|---------|------------------------|
-- | Public read listed properties    | anon           | SELECT  | active, reserved     |
-- | Public read sold properties      | anon           | SELECT  | sold                   |
-- | properties_select_authenticated  | authenticated  | SELECT  | vše                    |
-- | properties_insert_authenticated  | authenticated  | INSERT  | vše                    |
-- | properties_update_authenticated  | authenticated  | UPDATE  | vše                    |
-- | properties_delete_authenticated  | authenticated  | DELETE  | vše                    |
-- =============================================================================
