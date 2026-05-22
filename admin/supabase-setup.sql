-- Spusťte v Supabase SQL Editoru (jednorázově nebo po úpravě politik).

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric check (price is null or price >= 0),
  location text not null,
  type text not null check (type in ('sale', 'rent')),
  status text not null default 'active' check (status in ('active', 'reserved', 'sold')),
  link text not null,
  image text not null,
  created_at timestamptz not null default now()
);

alter table public.properties enable row level security;

-- Politiky properties: viz admin/properties-policies-reset.sql (reset + status)
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'properties'
  loop
    execute format('drop policy if exists %I on public.properties', pol.policyname);
  end loop;
end $$;

create policy "Public read listed properties"
  on public.properties for select to anon
  using (status in ('active', 'reserved'));

create policy "Public read sold properties"
  on public.properties for select to anon
  using (status = 'sold');

create policy "properties_select_authenticated"
  on public.properties for select to authenticated using (true);

create policy "properties_insert_authenticated"
  on public.properties for insert to authenticated with check (true);

create policy "properties_update_authenticated"
  on public.properties for update to authenticated using (true) with check (true);

create policy "properties_delete_authenticated"
  on public.properties for delete to authenticated using (true);

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

-- Cena je volitelná (spusťte i na existující tabulce)
alter table public.properties alter column price drop not null;
alter table public.properties drop constraint if exists properties_price_check;
alter table public.properties add constraint properties_price_check
  check (price is null or price >= 0);

-- Stav nemovitosti: active | reserved | sold (migrace ze sloupce sold)
alter table public.properties add column if not exists status text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'properties' and column_name = 'sold'
  ) then
    update public.properties
    set status = case when sold is true then 'sold' else 'active' end
    where status is null;
  end if;
end $$;

update public.properties set status = 'active' where status is null;

alter table public.properties alter column status set default 'active';
alter table public.properties alter column status set not null;

alter table public.properties drop constraint if exists properties_status_check;
alter table public.properties add constraint properties_status_check
  check (status in ('active', 'reserved', 'sold'));

alter table public.properties drop column if exists sold;

-- ---------------------------------------------------------------------------
-- Projekty (developerské projekty na webu)
-- ---------------------------------------------------------------------------

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  description text not null default '',
  link text not null,
  image text not null,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists "projects_public_read" on public.projects;
drop policy if exists "projects_select_authenticated" on public.projects;
drop policy if exists "projects_insert_authenticated" on public.projects;
drop policy if exists "projects_update_authenticated" on public.projects;
drop policy if exists "projects_delete_authenticated" on public.projects;

create policy "projects_public_read"
  on public.projects
  for select
  to anon
  using (true);

create policy "projects_select_authenticated"
  on public.projects
  for select
  to authenticated
  using (true);

create policy "projects_insert_authenticated"
  on public.projects
  for insert
  to authenticated
  with check (true);

create policy "projects_update_authenticated"
  on public.projects
  for update
  to authenticated
  using (true)
  with check (true);

create policy "projects_delete_authenticated"
  on public.projects
  for delete
  to authenticated
  using (true);

-- Storage: bucket project_images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project_images',
  'project_images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "project_images_public_read" on storage.objects;
drop policy if exists "project_images_auth_insert" on storage.objects;
drop policy if exists "project_images_auth_update" on storage.objects;
drop policy if exists "project_images_auth_delete" on storage.objects;

create policy "project_images_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'project_images');

create policy "project_images_auth_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'project_images');

create policy "project_images_auth_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'project_images')
  with check (bucket_id = 'project_images');

create policy "project_images_auth_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'project_images');
