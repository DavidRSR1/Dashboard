-- Módulo compartilhado de erros N1 (acesso + agentes + registros).
-- Master: david.oliveira@redesaoroque.com.br
-- Sem comandos DROP. Seguro reexecutar (políticas já existentes são ignoradas).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Acesso (quem pode abrir /erros no app)
-- ---------------------------------------------------------------------------
create table if not exists public.support_access (
  email text primary key,
  created_by text,
  created_at timestamptz not null default now()
);

alter table public.support_access enable row level security;

do $$ begin
  create policy "support_access_select_authenticated"
    on public.support_access for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "support_access_insert_master"
    on public.support_access for insert to authenticated
    with check (
      lower(coalesce(auth.jwt() ->> 'email', '')) = 'david.oliveira@redesaoroque.com.br'
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "support_access_delete_master"
    on public.support_access for delete to authenticated
    using (
      lower(coalesce(auth.jwt() ->> 'email', '')) = 'david.oliveira@redesaoroque.com.br'
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "support_access_update_master"
    on public.support_access for update to authenticated
    using (
      lower(coalesce(auth.jwt() ->> 'email', '')) = 'david.oliveira@redesaoroque.com.br'
    )
    with check (
      lower(coalesce(auth.jwt() ->> 'email', '')) = 'david.oliveira@redesaoroque.com.br'
    );
exception when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.support_access to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_support_master()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'david.oliveira@redesaoroque.com.br';
$$;

create or replace function public.support_agent_id_for_me()
returns text
language sql
stable
as $$
  select 'agent_' || split_part(lower(coalesce(auth.jwt() ->> 'email', '')), '@', 1);
$$;

create or replace function public.has_support_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'david.oliveira@redesaoroque.com.br'
    or exists (
      select 1
      from public.support_access a
      where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

grant execute on function public.has_support_access() to authenticated;
grant execute on function public.is_support_master() to authenticated;
grant execute on function public.support_agent_id_for_me() to authenticated;

-- ---------------------------------------------------------------------------
-- Agentes
-- ---------------------------------------------------------------------------
create table if not exists public.support_agents (
  id text primary key,
  name text not null,
  color_id text not null,
  created_at timestamptz not null default now()
);

alter table public.support_agents enable row level security;

do $$ begin
  create policy "support_agents_select"
    on public.support_agents for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "support_agents_insert"
    on public.support_agents for insert to authenticated with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "support_agents_update"
    on public.support_agents for update to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "support_agents_delete"
    on public.support_agents for delete to authenticated
    using (public.is_support_master());
exception when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.support_agents to authenticated;

-- ---------------------------------------------------------------------------
-- Erros
-- ---------------------------------------------------------------------------
create table if not exists public.support_errors (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null,
  title text not null,
  description text not null,
  resolution text,
  module text not null default '',
  status text not null default 'novo',
  severity text not null default 'medio',
  requester text,
  agent_id text,
  resolved_by_id text,
  transferred_by_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_errors_occurred_at_idx
  on public.support_errors (occurred_at desc);

alter table public.support_errors enable row level security;

do $$ begin
  create policy "support_errors_select"
    on public.support_errors for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "support_errors_insert"
    on public.support_errors for insert to authenticated with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "support_errors_update"
    on public.support_errors for update to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "support_errors_delete"
    on public.support_errors for delete to authenticated using (true);
exception when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.support_errors to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.support_errors;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.support_agents;
  exception when duplicate_object then null;
  end;
end $$;
