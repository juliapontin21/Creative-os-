-- Central da Vida · Fase 1 · Base multiusuário
-- Como usar: no projeto NOVO do Supabase, abra SQL Editor → New query, cole tudo e clique em Run.
-- Pode rodar de novo sem perder dados (o script é idempotente).
-- Antes de rodar, troque o e-mail do Michelangelo na seção "EDITE AQUI" no fim do arquivo.

-- ───────────────────────── Núcleo: casa, e-mails liberados, perfis ─────────────────────────

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Lista de quem pode entrar. Sem políticas: ninguém lê pelo app, só o banco.
create table if not exists public.allowed_emails (
  email text primary key,
  display_name text not null,
  color text not null default '#6366f1',
  household_id uuid not null references public.households on delete cascade
);

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  household_id uuid not null references public.households,
  email text not null,
  display_name text not null check (length(trim(display_name)) between 1 and 40),
  color text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Casa da pessoa logada (security definer para não cair em recursão de RLS).
create or replace function public.my_household() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.profiles where id = auth.uid()
$$;

-- Regra única de leitura: mesma casa e (registro do Casal ou registro meu).
create or replace function public.can_see(p_household uuid, p_owner uuid, p_scope text) returns boolean
language sql stable as $$
  select p_household = public.my_household() and (p_scope = 'casal' or p_owner = auth.uid())
$$;

-- Cria o perfil no primeiro login; recusa e-mail que não está liberado.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare a public.allowed_emails;
begin
  select * into a from public.allowed_emails where lower(email) = lower(new.email);
  if not found then
    raise exception 'acesso_negado: este e-mail não está liberado no Central da Vida';
  end if;
  insert into public.profiles (id, household_id, email, display_name, color)
  values (new.id, a.household_id, new.email, a.display_name, a.color)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.households enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.profiles enable row level security;

drop policy if exists households_sel on public.households;
create policy households_sel on public.households for select using (id = public.my_household());

drop policy if exists profiles_sel on public.profiles;
create policy profiles_sel on public.profiles for select using (household_id = public.my_household());
drop policy if exists profiles_upd on public.profiles;
create policy profiles_upd on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- Só nome e cor podem ser alterados pelo app.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, color, updated_at) on public.profiles to authenticated;

-- ───────────────────────── Tabelas com dono e escopo ─────────────────────────
-- Todo registro: household_id, owner_id (quem criou), scope ('pessoal' = só o dono, 'casal' = os dois).

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  scope text not null default 'casal' check (scope in ('pessoal', 'casal')),
  module text not null check (module in ('geral','notas','financas','agenda','habitos','alimentacao','mercado','treinos','biblioteca')),
  parent_id uuid references public.categories on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  color text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists categories_household_idx on public.categories (household_id, module);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  scope text not null default 'pessoal' check (scope in ('pessoal', 'casal')),
  category_id uuid references public.categories on delete set null,
  title text not null check (length(trim(title)) between 1 and 200),
  body text not null default '',
  date date,
  status text not null default 'aberta' check (status in ('aberta', 'concluida')),
  pinned boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_household_idx on public.notes (household_id, date);

create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  scope text not null default 'pessoal' check (scope in ('pessoal', 'casal')),
  module text not null,
  name text not null check (length(trim(name)) between 1 and 40),
  filters jsonb not null default '{}'::jsonb,
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Histórico de alterações (quem fez o quê). Só leitura pelo app.
create table if not exists public.audit_log (
  id bigserial primary key,
  household_id uuid not null,
  actor_id uuid,
  table_name text not null,
  row_id uuid not null,
  row_owner uuid,
  row_scope text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  at timestamptz not null default now()
);
create index if not exists audit_row_idx on public.audit_log (table_name, row_id);
alter table public.audit_log enable row level security;
drop policy if exists audit_sel on public.audit_log;
create policy audit_sel on public.audit_log for select using (public.can_see(household_id, row_owner, row_scope));
revoke insert, update, delete on public.audit_log from anon, authenticated;

-- Carimbo de dono/casa/datas e proteção de propriedade.
create or replace function public.stamp() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.owner_id := auth.uid();
      new.household_id := public.my_household();
    end if;
    new.created_at := now();
  else
    if new.owner_id is distinct from old.owner_id or new.household_id is distinct from old.household_id then
      raise exception 'Não é possível trocar o dono de um registro.';
    end if;
    if new.scope is distinct from old.scope and auth.uid() is distinct from old.owner_id then
      raise exception 'Só quem criou pode mudar a visibilidade.';
    end if;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  insert into public.audit_log (household_id, actor_id, table_name, row_id, row_owner, row_scope, action, old_data, new_data)
  values (r.household_id, auth.uid(), tg_table_name, r.id, r.owner_id, r.scope, lower(tg_op),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;

-- Categoria: no máximo um nível de subcategoria; subcategoria herda módulo e escopo da mãe.
create or replace function public.category_rules() returns trigger
language plpgsql as $$
declare p public.categories;
begin
  if new.parent_id is not null then
    select * into p from public.categories where id = new.parent_id;
    if not found or p.household_id <> new.household_id then raise exception 'Categoria-mãe inválida.'; end if;
    if p.parent_id is not null then raise exception 'Use no máximo um nível de subcategoria.'; end if;
    if p.id = new.id then raise exception 'Categoria-mãe inválida.'; end if;
    if p.scope = 'pessoal' and p.owner_id <> new.owner_id then raise exception 'Categoria-mãe inválida.'; end if;
    new.module := p.module;
    new.scope := p.scope;
  end if;
  return new;
end $$;

-- Mantém subcategorias com o mesmo escopo e módulo da mãe quando ela muda.
create or replace function public.category_cascade() returns trigger
language plpgsql as $$
begin
  if new.scope is distinct from old.scope or new.module is distinct from old.module then
    update public.categories set scope = new.scope, module = new.module where parent_id = new.id;
  end if;
  return null;
end $$;

-- Item do Casal não pode usar categoria pessoal (o outro não enxergaria).
create or replace function public.category_ref_rules() returns trigger
language plpgsql as $$
declare c public.categories;
begin
  if new.category_id is not null then
    select * into c from public.categories where id = new.category_id;
    if not found or c.household_id <> new.household_id then raise exception 'Categoria inválida.'; end if;
    if c.scope = 'pessoal' and (new.scope = 'casal' or c.owner_id <> new.owner_id) then
      raise exception 'Itens do Casal precisam de uma categoria do Casal.';
    end if;
  end if;
  return new;
end $$;

-- Políticas, carimbo e histórico iguais para todas as tabelas com escopo.
do $$
declare t text;
begin
  foreach t in array array['categories', 'notes', 'saved_views'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_sel', t);
    execute format('create policy %I on public.%I for select using (public.can_see(household_id, owner_id, scope))', t || '_sel', t);
    execute format('drop policy if exists %I on public.%I', t || '_ins', t);
    execute format('create policy %I on public.%I for insert with check (household_id = public.my_household() and owner_id = auth.uid())', t || '_ins', t);
    execute format('drop policy if exists %I on public.%I', t || '_upd', t);
    execute format('create policy %I on public.%I for update using (public.can_see(household_id, owner_id, scope)) with check (public.can_see(household_id, owner_id, scope))', t || '_upd', t);
    execute format('drop policy if exists %I on public.%I', t || '_del', t);
    execute format('create policy %I on public.%I for delete using (public.can_see(household_id, owner_id, scope))', t || '_del', t);
    execute format('drop trigger if exists a_stamp on public.%I', t);
    execute format('create trigger a_stamp before insert or update on public.%I for each row execute function public.stamp()', t);
    execute format('drop trigger if exists z_audit on public.%I', t);
    execute format('create trigger z_audit after insert or update or delete on public.%I for each row execute function public.audit()', t);
  end loop;
end $$;

drop trigger if exists b_rules on public.categories;
create trigger b_rules before insert or update on public.categories for each row execute function public.category_rules();
drop trigger if exists c_cascade on public.categories;
create trigger c_cascade after update on public.categories for each row execute function public.category_cascade();
drop trigger if exists b_rules on public.notes;
create trigger b_rules before insert or update on public.notes for each row execute function public.category_ref_rules();

grant select, insert, update, delete on public.categories, public.notes, public.saved_views to authenticated;
grant select on public.profiles, public.households, public.audit_log to authenticated;

-- Sincronização em tempo real entre os dois celulares.
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['profiles', 'categories', 'notes', 'saved_views'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- ───────────────────────── EDITE AQUI ─────────────────────────
-- Troque o e-mail do Michelangelo (mantenha as aspas). Nomes e cores podem ser mudados depois no app.
do $$
declare h uuid;
begin
  select id into h from public.households order by created_at limit 1;
  if h is null then
    insert into public.households (name) values ('Júlia & Michelangelo') returning id into h;
  end if;
  insert into public.allowed_emails (email, display_name, color, household_id) values
    ('juliapontin21@gmail.com', 'Júlia', '#db2777', h),
    ('EMAIL_DO_MICHELANGELO@gmail.com', 'Michelangelo', '#2563eb', h)
  on conflict (email) do nothing;
end $$;
