-- Central da Vida · Fase 2A · Base do dinheiro
-- Como usar: SQL Editor → New query, cole tudo e clique em Run (depois de já ter rodado o schema.sql).
-- Pode rodar de novo sem perder dados.
--
-- Contextos financeiros:
--   'empresa' → só o dono vê e edita (Empresa Júlia)
--   'pf'      → o dono vê e edita; o parceiro só VÊ
--   'casal'   → os dois veem e editam

-- ───────────────────────── Perfil: quem tem empresa ─────────────────────────
alter table public.profiles add column if not exists has_company boolean not null default false;
update public.profiles set has_company = true where lower(email) = 'juliapontin21@gmail.com';

-- Perfis criados depois (primeiro login) também recebem a marca de empresa.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare a public.allowed_emails;
begin
  select * into a from public.allowed_emails where lower(email) = lower(new.email);
  if not found then
    raise exception 'acesso_negado: este e-mail não está liberado no Central da Vida';
  end if;
  insert into public.profiles (id, household_id, email, display_name, color, has_company)
  values (new.id, a.household_id, new.email, a.display_name, a.color, lower(new.email) = 'juliapontin21@gmail.com')
  on conflict (id) do nothing;
  return new;
end $$;

-- ───────────────────────── Regras de acesso ─────────────────────────
create or replace function public.fin_can_read(p_household uuid, p_owner uuid, p_context text) returns boolean
language sql stable as $$
  select p_household = public.my_household() and (p_context in ('casal', 'pf') or p_owner = auth.uid())
$$;
create or replace function public.fin_can_write(p_household uuid, p_owner uuid, p_context text) returns boolean
language sql stable as $$
  select p_household = public.my_household() and (p_context = 'casal' or p_owner = auth.uid())
$$;

-- ───────────────────────── Tabelas ─────────────────────────
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'pf' check (context in ('empresa', 'pf', 'casal')),
  name text not null check (length(trim(name)) between 1 and 60),
  kind text not null default 'corrente' check (kind in ('corrente', 'poupanca', 'carteira', 'investimento', 'outro')),
  initial_balance_cents bigint not null default 0,
  initial_date date not null default current_date,
  color text not null default '#2563eb' check (color ~ '^#[0-9a-fA-F]{6}$'),
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'pf' check (context in ('empresa', 'pf', 'casal')),
  name text not null check (length(trim(name)) between 1 and 60),
  pay_account_id uuid references public.accounts on delete set null,
  closing_day int not null check (closing_day between 1 and 31),
  due_day int not null check (due_day between 1 and 31),
  limit_cents bigint check (limit_cents is null or limit_cents >= 0),
  is_couple_card boolean not null default false,
  color text not null default '#7c3aed' check (color ~ '^#[0-9a-fA-F]{6}$'),
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Um único cartão do casal ativo por casa (regra R3).
create unique index if not exists cards_one_couple_card on public.cards (household_id) where is_couple_card and archived_at is null;

create table if not exists public.payees (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'casal' check (context in ('empresa', 'pf', 'casal')),
  name text not null check (length(trim(name)) between 1 and 80),
  pix_key text,
  pix_type text check (pix_type is null or pix_type in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')),
  notes text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'pf' check (context in ('empresa', 'pf', 'casal')),
  kind text not null check (kind in ('receita', 'despesa', 'transferencia')),
  direction text check (direction is null or direction in ('entrada', 'saida')),
  status text not null default 'previsto' check (status in ('previsto', 'realizado', 'cancelado')),
  amount_cents bigint not null check (amount_cents > 0),
  description text not null check (length(trim(description)) between 1 and 120),
  competence_date date not null default current_date,
  due_date date not null default current_date,
  paid_date date,
  account_id uuid references public.accounts on delete restrict,
  card_id uuid references public.cards on delete restrict,
  payee_id uuid references public.payees on delete set null,
  client text not null default '',
  category_id uuid references public.categories on delete set null,
  payment_method text not null default 'pix' check (payment_method in ('pix', 'debito', 'boleto', 'cartao', 'dinheiro', 'transferencia', 'outro')),
  payment_link text not null default '',
  tags text[] not null default '{}',
  notes text not null default '',
  installment_group uuid,
  installment_no int,
  installment_total int,
  transfer_group uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((installment_no is null) = (installment_total is null)),
  check (installment_total is null or (installment_no between 1 and installment_total and installment_total between 2 and 48))
);
create index if not exists transactions_household_due on public.transactions (household_id, due_date);
create index if not exists transactions_card_due on public.transactions (card_id, due_date);
create index if not exists transactions_transfer on public.transactions (transfer_group);
create index if not exists transactions_installments on public.transactions (installment_group);

-- ───────────────────────── Regras de negócio ─────────────────────────

-- Carimbo de dono/casa/datas para tabelas financeiras.
create or replace function public.fin_stamp() returns trigger
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
    if new.context is distinct from old.context and auth.uid() is distinct from old.owner_id then
      raise exception 'Só quem criou pode mudar a aba do lançamento.';
    end if;
    new.created_at := old.created_at;
  end if;
  if new.context = 'empresa' and not coalesce((select has_company from public.profiles where id = new.owner_id), false) then
    raise exception 'Este perfil não tem empresa cadastrada.';
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Histórico: aceita tabelas com "scope" ou com "context".
create or replace function public.audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; j jsonb;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  j := to_jsonb(r);
  insert into public.audit_log (household_id, actor_id, table_name, row_id, row_owner, row_scope, action, old_data, new_data)
  values ((j->>'household_id')::uuid, auth.uid(), tg_table_name, (j->>'id')::uuid, (j->>'owner_id')::uuid,
          coalesce(j->>'scope', j->>'context'), lower(tg_op),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;

-- Vencimento da fatura de uma compra no cartão.
-- Compra no dia do fechamento ou depois entra na fatura seguinte.
-- A fatura vence no mês do fechamento se o dia de vencimento for depois do fechamento; senão, no mês seguinte.
create or replace function public.card_due_date(p_closing int, p_due int, p_purchase date) returns date
language plpgsql immutable as $$
declare m date := date_trunc('month', p_purchase)::date; close_d date; last_day int;
begin
  last_day := extract(day from (m + interval '1 month - 1 day'))::int;
  close_d := m + (least(p_closing, last_day) - 1);
  if p_purchase >= close_d then m := (m + interval '1 month')::date; end if;
  if p_due <= p_closing then m := (m + interval '1 month')::date; end if;
  last_day := extract(day from (m + interval '1 month - 1 day'))::int;
  return m + (least(p_due, last_day) - 1);
end $$;

-- Coerência de um vínculo (conta, cartão, favorecido) com o lançamento ou cartão que o usa.
create or replace function public.fin_link_ok(p_ctx text, p_owner uuid, l_household uuid, l_ctx text, l_owner uuid, p_household uuid) returns boolean
language sql immutable as $$
  select l_household = p_household and (
    (p_ctx = 'casal' and l_ctx in ('casal', 'pf'))
    or (p_ctx <> 'casal' and l_ctx = p_ctx and l_owner = p_owner)
    or (p_ctx <> 'casal' and l_ctx = 'casal')
  )
$$;

create or replace function public.card_rules() returns trigger
language plpgsql as $$
declare a public.accounts;
begin
  if new.pay_account_id is not null then
    select * into a from public.accounts where id = new.pay_account_id;
    if not found or not public.fin_link_ok(new.context, new.owner_id, a.household_id, a.context, a.owner_id, new.household_id) then
      raise exception 'Conta de pagamento da fatura inválida para esta aba.';
    end if;
  end if;
  if new.is_couple_card and new.context <> 'casal' then
    raise exception 'O cartão do casal precisa estar na aba Casal.';
  end if;
  return new;
end $$;

create or replace function public.transaction_rules() returns trigger
language plpgsql as $$
declare a public.accounts; c public.cards; p public.payees; cat public.categories;
begin
  new.due_date := coalesce(new.due_date, new.competence_date);

  if new.kind = 'transferencia' then
    if new.direction is null then raise exception 'Transferência precisa de entrada ou saída.'; end if;
    if new.account_id is null then raise exception 'Transferência precisa de uma conta.'; end if;
    if new.transfer_group is null then raise exception 'Transferência precisa estar ligada ao par.'; end if;
    new.card_id := null;
    new.payment_method := 'transferencia';
  else
    new.direction := null;
    new.transfer_group := null;
  end if;

  if new.card_id is not null then
    if new.kind <> 'despesa' then raise exception 'Cartão só pode ser usado em despesas.'; end if;
    select * into c from public.cards where id = new.card_id;
    if not found or not public.fin_link_ok(new.context, new.owner_id, c.household_id, c.context, c.owner_id, new.household_id) then
      raise exception 'Cartão inválido para esta aba.';
    end if;
    new.account_id := null;
    new.payment_method := 'cartao';
    if tg_op = 'INSERT' or new.card_id is distinct from old.card_id or new.competence_date is distinct from old.competence_date then
      new.due_date := public.card_due_date(c.closing_day, c.due_day, new.competence_date);
    end if;
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
    if not found or cat.household_id <> new.household_id or cat.module <> 'financas' then
      raise exception 'Categoria inválida.';
    end if;
    if cat.scope = 'pessoal' and (new.context = 'casal' or cat.owner_id <> new.owner_id) then
      raise exception 'Lançamentos do Casal precisam de uma categoria do Casal.';
    end if;
  end if;

  if new.status = 'realizado' then
    new.paid_date := coalesce(new.paid_date, current_date);
  else
    new.paid_date := null;
  end if;
  return new;
end $$;

-- ───────────────────────── Políticas e gatilhos ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['accounts', 'cards', 'payees', 'transactions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_sel', t);
    execute format('create policy %I on public.%I for select using (public.fin_can_read(household_id, owner_id, context))', t || '_sel', t);
    execute format('drop policy if exists %I on public.%I', t || '_ins', t);
    execute format('create policy %I on public.%I for insert with check (household_id = public.my_household() and owner_id = auth.uid())', t || '_ins', t);
    execute format('drop policy if exists %I on public.%I', t || '_upd', t);
    execute format('drop policy if exists %I on public.%I', t || '_del', t);
    if t = 'transactions' then
      -- Transferências só podem ser alteradas por quem criou (as duas pontas andam juntas).
      execute format('create policy %I on public.%I for update using (public.fin_can_write(household_id, owner_id, context) and (kind <> ''transferencia'' or owner_id = auth.uid())) with check (public.fin_can_write(household_id, owner_id, context))', t || '_upd', t);
      execute format('create policy %I on public.%I for delete using (public.fin_can_write(household_id, owner_id, context) and (kind <> ''transferencia'' or owner_id = auth.uid()))', t || '_del', t);
    else
      execute format('create policy %I on public.%I for update using (public.fin_can_write(household_id, owner_id, context)) with check (public.fin_can_write(household_id, owner_id, context))', t || '_upd', t);
      execute format('create policy %I on public.%I for delete using (public.fin_can_write(household_id, owner_id, context))', t || '_del', t);
    end if;
    execute format('drop trigger if exists a_stamp on public.%I', t);
    execute format('create trigger a_stamp before insert or update on public.%I for each row execute function public.fin_stamp()', t);
    execute format('drop trigger if exists z_audit on public.%I', t);
    execute format('create trigger z_audit after insert or update or delete on public.%I for each row execute function public.audit()', t);
  end loop;
end $$;

drop trigger if exists b_rules on public.cards;
create trigger b_rules before insert or update on public.cards for each row execute function public.card_rules();
drop trigger if exists b_rules on public.transactions;
create trigger b_rules before insert or update on public.transactions for each row execute function public.transaction_rules();

grant select, insert, update, delete on public.accounts, public.cards, public.payees, public.transactions to authenticated;

-- Tempo real.
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['accounts', 'cards', 'payees', 'transactions'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
