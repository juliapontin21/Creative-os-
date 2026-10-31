-- Central da Vida · Fase 3A · Metas, limites e alertas
-- Como usar: SQL Editor → New query, cole tudo e clique em Run (depois de schema, fase2a e fase2b).
-- Pode rodar de novo sem perder dados.

-- ───────────────────────── Tipo de gasto da categoria (50/30/20 e empresa) ─────────────────────────
alter table public.categories add column if not exists fin_bucket text check (fin_bucket is null or fin_bucket in ('fixo', 'lazer', 'imposto'));

-- ───────────────────────── Regras da casa (referências editáveis) ─────────────────────────
-- Uma linha por aba: Casal (dos dois), PF (de cada um), Empresa (da Júlia). Os números ficam em "params".
create table if not exists public.house_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null check (context in ('empresa', 'pf', 'casal')),
  params jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists house_rules_one on public.house_rules
  (household_id, context, (case when context = 'casal' then '00000000-0000-0000-0000-000000000000'::uuid else owner_id end));

-- ───────────────────────── Caixinhas ─────────────────────────
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'casal' check (context in ('empresa', 'pf', 'casal')),
  name text not null check (length(trim(name)) between 1 and 60),
  kind text not null default 'desejo' check (kind in ('desejo', 'reserva', 'investimento')),
  target_cents bigint not null check (target_cents > 0),
  deadline date,
  color text not null default '#059669' check (color ~ '^#[0-9a-fA-F]{6}$'),
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_moves (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'casal' check (context in ('empresa', 'pf', 'casal')),
  goal_id uuid not null references public.goals on delete cascade,
  amount_cents bigint not null check (amount_cents <> 0),
  date date not null default current_date,
  note text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goal_moves_goal on public.goal_moves (goal_id);

-- Aporte/resgate herda a aba da caixinha; caixinha pessoal só recebe movimento do dono.
create or replace function public.goal_move_rules() returns trigger
language plpgsql as $$
declare g public.goals;
begin
  select * into g from public.goals where id = new.goal_id;
  if not found or g.household_id <> new.household_id then raise exception 'Caixinha inválida.'; end if;
  if g.context <> 'casal' and g.owner_id <> new.owner_id then raise exception 'Só quem criou esta caixinha pode movimentá-la.'; end if;
  new.context := g.context;
  return new;
end $$;

-- ───────────────────────── Limites por categoria ─────────────────────────
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'casal' check (context in ('empresa', 'pf', 'casal')),
  category_id uuid not null references public.categories on delete cascade,
  limit_cents bigint not null check (limit_cents > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists budgets_one on public.budgets
  (household_id, context, category_id, (case when context = 'casal' then '00000000-0000-0000-0000-000000000000'::uuid else owner_id end));

create or replace function public.budget_rules() returns trigger
language plpgsql as $$
declare cat public.categories;
begin
  select * into cat from public.categories where id = new.category_id;
  if not found or cat.household_id <> new.household_id or cat.module <> 'financas' then raise exception 'Categoria inválida.'; end if;
  if cat.scope = 'pessoal' and (new.context = 'casal' or cat.owner_id <> new.owner_id) then
    raise exception 'Limites do Casal precisam de uma categoria do Casal.';
  end if;
  return new;
end $$;

-- ───────────────────────── Políticas e gatilhos ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['house_rules', 'goals', 'goal_moves', 'budgets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_sel', t);
    execute format('create policy %I on public.%I for select using (public.fin_can_read(household_id, owner_id, context))', t || '_sel', t);
    execute format('drop policy if exists %I on public.%I', t || '_ins', t);
    execute format('create policy %I on public.%I for insert with check (household_id = public.my_household() and owner_id = auth.uid())', t || '_ins', t);
    execute format('drop policy if exists %I on public.%I', t || '_upd', t);
    execute format('create policy %I on public.%I for update using (public.fin_can_write(household_id, owner_id, context)) with check (public.fin_can_write(household_id, owner_id, context))', t || '_upd', t);
    execute format('drop policy if exists %I on public.%I', t || '_del', t);
    execute format('create policy %I on public.%I for delete using (public.fin_can_write(household_id, owner_id, context))', t || '_del', t);
    execute format('drop trigger if exists a_stamp on public.%I', t);
    execute format('create trigger a_stamp before insert or update on public.%I for each row execute function public.fin_stamp()', t);
    execute format('drop trigger if exists z_audit on public.%I', t);
    execute format('create trigger z_audit after insert or update or delete on public.%I for each row execute function public.audit()', t);
  end loop;
end $$;

drop trigger if exists b_rules on public.goal_moves;
create trigger b_rules before insert or update on public.goal_moves for each row execute function public.goal_move_rules();
drop trigger if exists b_rules on public.budgets;
create trigger b_rules before insert or update on public.budgets for each row execute function public.budget_rules();

grant select, insert, update, delete on public.house_rules, public.goals, public.goal_moves, public.budgets to authenticated;

do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['house_rules', 'goals', 'goal_moves', 'budgets'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
