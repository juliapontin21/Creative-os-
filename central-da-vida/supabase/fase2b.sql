-- Central da Vida · Fase 2B · Mês do casal, contas fixas, assinaturas, calendário e empresa
-- Como usar: SQL Editor → New query, cole tudo e clique em Run (depois do schema.sql e do fase2a.sql).
-- Pode rodar de novo sem perder dados.

-- ───────────────────────── Renda de referência (calibragem) ─────────────────────────
alter table public.profiles add column if not exists income_ref_cents bigint not null default 0 check (income_ref_cents >= 0);
-- Júlia: pró-labore de R$ 6.000 (regra da casa). Só preenche se ainda estiver zerado.
update public.profiles set income_ref_cents = 600000 where lower(email) = 'juliapontin21@gmail.com' and income_ref_cents = 0;
grant update (display_name, color, income_ref_cents, updated_at) on public.profiles to authenticated;

-- ───────────────────────── Contas fixas e assinaturas ─────────────────────────
create table if not exists public.recurrences (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'pf' check (context in ('empresa', 'pf', 'casal')),
  kind text not null default 'despesa' check (kind in ('receita', 'despesa')),
  description text not null check (length(trim(description)) between 1 and 120),
  amount_cents bigint not null check (amount_cents > 0),
  frequency text not null default 'mensal' check (frequency in ('semanal', 'mensal', 'anual')),
  start_date date not null default current_date,
  end_date date,
  account_id uuid references public.accounts on delete set null,
  card_id uuid references public.cards on delete set null,
  payee_id uuid references public.payees on delete set null,
  category_id uuid references public.categories on delete set null,
  payment_method text not null default 'pix' check (payment_method in ('pix', 'debito', 'boleto', 'cartao', 'dinheiro', 'transferencia', 'outro')),
  client text not null default '',
  payment_link text not null default '',
  is_subscription boolean not null default false,
  service_url text not null default '',
  vault_url text not null default '',
  generated_until date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

alter table public.transactions add column if not exists recurrence_id uuid references public.recurrences on delete set null;
-- Cada ocorrência de uma conta fixa existe uma vez só (evita duplicar quando os dois celulares geram juntos).
create unique index if not exists transactions_recurrence_once on public.transactions (recurrence_id, competence_date);

create or replace function public.recurrence_rules() returns trigger
language plpgsql as $$
declare a public.accounts; c public.cards; p public.payees; cat public.categories;
begin
  if new.card_id is not null then
    if new.kind <> 'despesa' then raise exception 'Cartão só pode ser usado em despesas.'; end if;
    select * into c from public.cards where id = new.card_id;
    if not found or not public.fin_link_ok(new.context, new.owner_id, c.household_id, c.context, c.owner_id, new.household_id) then
      raise exception 'Cartão inválido para esta aba.';
    end if;
    new.account_id := null;
    new.payment_method := 'cartao';
  elsif new.payment_method = 'cartao' then
    raise exception 'Escolha o cartão.';
  end if;
  if new.account_id is not null then
    select * into a from public.accounts where id = new.account_id;
    if not found or not public.fin_link_ok(new.context, new.owner_id, a.household_id, a.context, a.owner_id, new.household_id) then
      raise exception 'Conta inválida para esta aba.';
    end if;
  end if;
  if new.payee_id is not null then
    select * into p from public.payees where id = new.payee_id;
    if not found or not public.fin_link_ok(new.context, new.owner_id, p.household_id, p.context, p.owner_id, new.household_id) then
      raise exception 'Favorecido inválido para esta aba.';
    end if;
  end if;
  if new.category_id is not null then
    select * into cat from public.categories where id = new.category_id;
    if not found or cat.household_id <> new.household_id or cat.module <> 'financas' then raise exception 'Categoria inválida.'; end if;
    if cat.scope = 'pessoal' and (new.context = 'casal' or cat.owner_id <> new.owner_id) then
      raise exception 'Lançamentos do Casal precisam de uma categoria do Casal.';
    end if;
  end if;
  return new;
end $$;

-- ───────────────────────── Mês do casal ─────────────────────────
-- Um registro por mês: quanto vai para caixinhas/reserva e ajustes de renda daquele mês.
create table if not exists public.month_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'casal' check (context = 'casal'),
  month date not null check (extract(day from month) = 1),
  savings_cents bigint not null default 0 check (savings_cents >= 0),
  income_overrides jsonb not null default '{}'::jsonb,
  notes text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, month)
);

-- ───────────────────────── Políticas e gatilhos ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['recurrences', 'month_plans'] loop
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

drop trigger if exists b_rules on public.recurrences;
create trigger b_rules before insert or update on public.recurrences for each row execute function public.recurrence_rules();

grant select, insert, update, delete on public.recurrences, public.month_plans to authenticated;

do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['recurrences', 'month_plans'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
