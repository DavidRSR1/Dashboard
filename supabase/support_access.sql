-- Execute no SQL Editor do Supabase para sincronizar o acesso do módulo /erros entre o time.
-- Master: david.oliveira@redesaoroque.com.br

create table if not exists public.support_access (
  email text primary key,
  created_by text,
  created_at timestamptz not null default now()
);

alter table public.support_access enable row level security;

drop policy if exists "support_access_select_authenticated" on public.support_access;
create policy "support_access_select_authenticated"
  on public.support_access
  for select
  to authenticated
  using (true);

drop policy if exists "support_access_insert_master" on public.support_access;
create policy "support_access_insert_master"
  on public.support_access
  for insert
  to authenticated
  with check (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'david.oliveira@redesaoroque.com.br'
  );

drop policy if exists "support_access_delete_master" on public.support_access;
create policy "support_access_delete_master"
  on public.support_access
  for delete
  to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'david.oliveira@redesaoroque.com.br'
  );

drop policy if exists "support_access_update_master" on public.support_access;
create policy "support_access_update_master"
  on public.support_access
  for update
  to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'david.oliveira@redesaoroque.com.br'
  )
  with check (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'david.oliveira@redesaoroque.com.br'
  );
