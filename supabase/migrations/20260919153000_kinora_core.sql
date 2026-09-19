-- Kinora core schema
-- Creates private per-user data models, storage buckets, and RLS policies.

create extension if not exists pgcrypto;

-- ---------- shared helpers ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- ---------- characters ----------

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text,
  notes text,
  default_prompt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists characters_user_id_idx on public.characters(user_id);

alter table public.characters enable row level security;

create policy "characters_select_own"
on public.characters
for select
to authenticated
using (auth.uid() = user_id);

create policy "characters_insert_own"
on public.characters
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "characters_update_own"
on public.characters
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "characters_delete_own"
on public.characters
for delete
to authenticated
using (auth.uid() = user_id);

drop trigger if exists characters_set_updated_at on public.characters;
create trigger characters_set_updated_at
before update on public.characters
for each row execute procedure public.set_updated_at();

-- ---------- character references ----------

create table if not exists public.character_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  storage_path text not null,
  label text,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists character_references_user_id_idx
  on public.character_references(user_id);

create index if not exists character_references_character_id_idx
  on public.character_references(character_id);

alter table public.character_references enable row level security;

create policy "character_references_select_own"
on public.character_references
for select
to authenticated
using (auth.uid() = user_id);

create policy "character_references_insert_own"
on public.character_references
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "character_references_update_own"
on public.character_references
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "character_references_delete_own"
on public.character_references
for delete
to authenticated
using (auth.uid() = user_id);

-- ---------- projects ----------

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  cover_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);

alter table public.projects enable row level security;

create policy "projects_select_own"
on public.projects
for select
to authenticated
using (auth.uid() = user_id);

create policy "projects_insert_own"
on public.projects
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "projects_update_own"
on public.projects
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "projects_delete_own"
on public.projects
for delete
to authenticated
using (auth.uid() = user_id);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute procedure public.set_updated_at();

-- ---------- generations ----------

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  character_id uuid references public.characters(id) on delete set null,
  kind text not null default 'image'
    check (kind in ('image', 'video', 'edit')),
  prompt text not null,
  negative_prompt text,
  provider text,
  model text,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed')),
  output_path text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generations_user_id_idx on public.generations(user_id);
create index if not exists generations_project_id_idx on public.generations(project_id);
create index if not exists generations_character_id_idx on public.generations(character_id);
create index if not exists generations_created_at_idx on public.generations(created_at desc);

alter table public.generations enable row level security;

create policy "generations_select_own"
on public.generations
for select
to authenticated
using (auth.uid() = user_id);

create policy "generations_insert_own"
on public.generations
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "generations_update_own"
on public.generations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "generations_delete_own"
on public.generations
for delete
to authenticated
using (auth.uid() = user_id);

drop trigger if exists generations_set_updated_at on public.generations;
create trigger generations_set_updated_at
before update on public.generations
for each row execute procedure public.set_updated_at();

-- ---------- project assets ----------

create table if not exists public.project_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  generation_id uuid references public.generations(id) on delete set null,
  asset_type text not null default 'image'
    check (asset_type in ('image', 'video', 'reference', 'document', 'other')),
  storage_path text not null,
  title text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists project_assets_user_id_idx on public.project_assets(user_id);
create index if not exists project_assets_project_id_idx on public.project_assets(project_id);
create index if not exists project_assets_generation_id_idx on public.project_assets(generation_id);

alter table public.project_assets enable row level security;

create policy "project_assets_select_own"
on public.project_assets
for select
to authenticated
using (auth.uid() = user_id);

create policy "project_assets_insert_own"
on public.project_assets
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "project_assets_update_own"
on public.project_assets
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "project_assets_delete_own"
on public.project_assets
for delete
to authenticated
using (auth.uid() = user_id);

-- ---------- storage buckets ----------

insert into storage.buckets (id, name, public)
values
  ('character-references', 'character-references', false),
  ('generations', 'generations', false),
  ('project-assets', 'project-assets', false)
on conflict (id) do nothing;

-- Every private file path must begin with the authenticated user's UUID:
-- <user-id>/<rest-of-path>

create policy "character_refs_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'character-references'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "character_refs_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'character-references'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "character_refs_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'character-references'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'character-references'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "character_refs_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'character-references'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "generations_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'generations'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "generations_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'generations'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "generations_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'generations'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'generations'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "generations_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'generations'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "project_assets_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "project_assets_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "project_assets_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'project-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'project-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "project_assets_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);
