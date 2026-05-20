-- Spusťte v Supabase SQL Editoru (jednorázově nebo po úpravě politik).

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null check (price >= 0),
  location text not null,
  type text not null check (type in ('sale', 'rent')),
  sold boolean not null default false,
  link text not null,
  image text not null,
  created_at timestamptz not null default now()
);

alter table public.properties enable row level security;

-- Odstraňte staré politiky, pokud existují (upravte názvy dle vašeho projektu)
drop policy if exists "Public read active properties" on public.properties;
drop policy if exists "Authenticated full access" on public.properties;
drop policy if exists "properties_select_authenticated" on public.properties;
drop policy if exists "properties_insert_authenticated" on public.properties;
drop policy if exists "properties_update_authenticated" on public.properties;
drop policy if exists "properties_delete_authenticated" on public.properties;

-- Veřejné čtení aktivních (volitelné pro frontend)
create policy "Public read active properties"
  on public.properties
  for select
  to anon
  using (sold = false);

-- Admin: přihlášený uživatel (role authenticated) — SELECT
create policy "properties_select_authenticated"
  on public.properties
  for select
  to authenticated
  using (true);

-- Admin: INSERT
create policy "properties_insert_authenticated"
  on public.properties
  for insert
  to authenticated
  with check (true);

-- Admin: UPDATE
create policy "properties_update_authenticated"
  on public.properties
  for update
  to authenticated
  using (true)
  with check (true);

-- Admin: DELETE
create policy "properties_delete_authenticated"
  on public.properties
  for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Storage: bucket property_images (obrázky nemovitostí)
-- V Dashboard také: Storage → New bucket → id: property_images, Public: ON
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property_images',
  'property_images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "property_images_public_read" on storage.objects;
drop policy if exists "property_images_auth_insert" on storage.objects;
drop policy if exists "property_images_auth_update" on storage.objects;
drop policy if exists "property_images_auth_delete" on storage.objects;

-- Veřejné čtení obrázků (zobrazí je web)
create policy "property_images_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'property_images');

-- Admin: nahrání
create policy "property_images_auth_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'property_images');

-- Admin: přepsání / metadata
create policy "property_images_auth_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'property_images')
  with check (bucket_id = 'property_images');

-- Admin: smazání souboru
create policy "property_images_auth_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'property_images');
