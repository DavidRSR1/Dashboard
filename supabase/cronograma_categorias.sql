-- Catálogo de categorias do cronograma (renomear / arquivar).
-- Execute no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.cronograma_categorias (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cronograma_categorias_archived_at_idx
  on public.cronograma_categorias (archived_at);

alter table public.cronograma_categorias enable row level security;

drop policy if exists "cronograma_categorias_select" on public.cronograma_categorias;
drop policy if exists "cronograma_categorias_insert" on public.cronograma_categorias;
drop policy if exists "cronograma_categorias_update" on public.cronograma_categorias;
drop policy if exists "cronograma_categorias_delete" on public.cronograma_categorias;

create policy "cronograma_categorias_select"
  on public.cronograma_categorias
  for select
  to authenticated
  using (true);

create policy "cronograma_categorias_insert"
  on public.cronograma_categorias
  for insert
  to authenticated
  with check (true);

create policy "cronograma_categorias_update"
  on public.cronograma_categorias
  for update
  to authenticated
  using (true)
  with check (true);

create policy "cronograma_categorias_delete"
  on public.cronograma_categorias
  for delete
  to authenticated
  using (true);

grant select, insert, update, delete on public.cronograma_categorias to authenticated;

-- Seed opcional a partir das categorias já usadas nas atividades
insert into public.cronograma_categorias (name)
select distinct trim(categoria)
from public.cronograma_atividades
where categoria is not null and trim(categoria) <> ''
on conflict (name) do nothing;
