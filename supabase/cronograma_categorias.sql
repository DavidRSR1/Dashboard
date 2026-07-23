-- Catálogo de categorias do cronograma — por usuário.
-- Sem DROP de tabelas. Seguro reexecutar.

create extension if not exists "pgcrypto";

create table if not exists public.cronograma_categorias (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid references auth.users (id) on delete cascade,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migração: coluna user_id em bases que já tinham a tabela antiga
alter table public.cronograma_categorias
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- Remove unicidade global antiga (se existir)
alter table public.cronograma_categorias
  drop constraint if exists cronograma_categorias_name_key;

drop index if exists public.cronograma_categorias_user_name_uidx;

create index if not exists cronograma_categorias_user_id_idx
  on public.cronograma_categorias (user_id);

create index if not exists cronograma_categorias_archived_at_idx
  on public.cronograma_categorias (archived_at);

-- Backfill: uma categoria por (usuário, nome) a partir das atividades
insert into public.cronograma_categorias (name, user_id)
select distinct trim(a.categoria), a.created_by::uuid
from public.cronograma_atividades a
where a.categoria is not null
  and trim(a.categoria) <> ''
  and a.created_by is not null
  and a.created_by::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and not exists (
    select 1
    from public.cronograma_categorias c
    where c.user_id = a.created_by::uuid
      and c.name = trim(a.categoria)
  );

-- Remove registros órfãos do catálogo global antigo (sem dono)
delete from public.cronograma_categorias
where user_id is null;

-- Unicidade por usuário (necessário para upsert onConflict user_id,name)
do $$ begin
  alter table public.cronograma_categorias
    add constraint cronograma_categorias_user_name_key unique (user_id, name);
exception when duplicate_object then null;
end $$;

alter table public.cronograma_categorias enable row level security;

-- Políticas antigas (globais) → trocar por escopo do usuário
drop policy if exists "cronograma_categorias_select" on public.cronograma_categorias;
drop policy if exists "cronograma_categorias_insert" on public.cronograma_categorias;
drop policy if exists "cronograma_categorias_update" on public.cronograma_categorias;
drop policy if exists "cronograma_categorias_delete" on public.cronograma_categorias;
drop policy if exists "cronograma_categorias_select_own" on public.cronograma_categorias;
drop policy if exists "cronograma_categorias_insert_own" on public.cronograma_categorias;
drop policy if exists "cronograma_categorias_update_own" on public.cronograma_categorias;
drop policy if exists "cronograma_categorias_delete_own" on public.cronograma_categorias;

do $$ begin
  create policy "cronograma_categorias_select_own"
    on public.cronograma_categorias for select to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "cronograma_categorias_insert_own"
    on public.cronograma_categorias for insert to authenticated
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "cronograma_categorias_update_own"
    on public.cronograma_categorias for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "cronograma_categorias_delete_own"
    on public.cronograma_categorias for delete to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.cronograma_categorias to authenticated;

-- ---------------------------------------------------------------------------
-- Renomear categoria sem perder atividades nem tags do histórico
-- ---------------------------------------------------------------------------
create or replace function public.rename_cronograma_categoria(
  p_id uuid,
  p_old_name text,
  p_new_name text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_old text := trim(p_old_name);
  v_new text := trim(p_new_name);
begin
  if v_uid is null then
    raise exception 'Faça login para renomear categorias.';
  end if;

  if v_new is null or v_new = '' then
    raise exception 'Informe o novo nome.';
  end if;

  if v_new = v_old then
    return;
  end if;

  if not exists (
    select 1
    from public.cronograma_categorias c
    where c.id = p_id
      and c.user_id = v_uid
  ) then
    raise exception 'Categoria não encontrada.';
  end if;

  if exists (
    select 1
    from public.cronograma_categorias c
    where c.user_id = v_uid
      and c.name = v_new
      and c.id <> p_id
  ) then
    raise exception 'Já existe uma categoria com esse nome.';
  end if;

  -- 1) catálogo
  update public.cronograma_categorias
  set name = v_new,
      updated_at = now()
  where id = p_id
    and user_id = v_uid;

  -- 2) atividades (do usuário + órfãs sem dono, para não “sumir” nada do board)
  update public.cronograma_atividades
  set categoria = v_new,
      updated_at = now()
  where trim(categoria) = v_old
    and (
      created_by::text = v_uid::text
      or created_by is null
    );

  -- 3) tags de categoria nos eventos (histórico)
  update public.cronograma_eventos e
  set dados = jsonb_set(
    coalesce(e.dados, '{}'::jsonb),
    '{categoria}',
    to_jsonb(v_new),
    true
  )
  where e.dados->>'categoria' = v_old
    and (
      e.created_by::text = v_uid::text
      or e.created_by is null
      or exists (
        select 1
        from public.cronograma_atividades a
        where a.id = e.atividade_id
          and (
            a.created_by::text = v_uid::text
            or a.created_by is null
          )
      )
    );
end;
$$;

grant execute on function public.rename_cronograma_categoria(uuid, text, text) to authenticated;

-- Atualiza o cache do PostgREST (evita erro "schema cache" / user_id)
notify pgrst, 'reload schema';
