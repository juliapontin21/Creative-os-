-- Central da Vida · Fase 4A · Agenda, hábitos e água
-- Como usar: SQL Editor → New query, cole tudo e clique em Run (depois das fases anteriores).
-- Pode rodar de novo sem perder dados.
--
-- Agenda: compromissos pessoais (o parceiro VÊ, só o dono edita) e do casal (os dois editam).
-- Hábitos e água: privados de cada um (o parceiro não vê).

-- ───────────────────────── Compromissos ─────────────────────────
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'pf' check (context in ('pf', 'casal')),
  title text not null check (length(trim(title)) between 1 and 120),
  notes text not null default '',
  location text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  category_id uuid references public.categories on delete set null,
  color text not null default '#4f46e5' check (color ~ '^#[0-9a-fA-F]{6}$'),
  impacts_partner boolean not null default false,
  done_at timestamptz,
  series_id uuid,
  series_rule text check (series_rule is null or series_rule in ('diario', 'semanal', 'mensal', 'anual')),
  reminders int[] not null default '{}',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index if not exists events_household_start on public.events (household_id, start_at);
create index if not exists events_series on public.events (series_id);

-- A cor do compromisso vem da categoria (assim o parceiro também vê a cor, mesmo de categoria pessoal).
create or replace function public.event_rules() returns trigger
language plpgsql as $$
declare cat public.categories;
begin
  if new.category_id is not null then
    select * into cat from public.categories where id = new.category_id;
    if not found or cat.household_id <> new.household_id or cat.module <> 'agenda' then raise exception 'Categoria inválida.'; end if;
    if cat.scope = 'pessoal' and (new.context = 'casal' or cat.owner_id <> new.owner_id) then
      raise exception 'Compromissos do Casal precisam de uma categoria do Casal.';
    end if;
    new.color := cat.color;
  end if;
  return new;
end $$;

-- Mudou a cor da categoria → os compromissos dela mudam de cor também.
create or replace function public.category_color_to_events() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.module = 'agenda' and new.color is distinct from old.color then
    update public.events set color = new.color where category_id = new.id;
  end if;
  return null;
end $$;
drop trigger if exists d_color_events on public.categories;
create trigger d_color_events after update on public.categories for each row execute function public.category_color_to_events();

-- ───────────────────────── Lembretes para o parceiro ─────────────────────────
create table if not exists public.partner_reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  from_id uuid not null default auth.uid() references public.profiles on delete cascade,
  to_id uuid not null references public.profiles on delete cascade,
  text text not null check (length(trim(text)) between 1 and 200),
  remind_at timestamptz not null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.partner_reminder_rules() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.from_id := auth.uid(); new.household_id := public.my_household(); end if;
    if not exists (select 1 from public.profiles where id = new.to_id and household_id = new.household_id) then raise exception 'Destinatário inválido.'; end if;
  else
    if new.from_id is distinct from old.from_id or new.to_id is distinct from old.to_id or new.household_id is distinct from old.household_id then
      raise exception 'Não é possível trocar quem envia ou recebe.';
    end if;
    -- Quem recebe só pode marcar como feito.
    if auth.uid() = old.to_id and auth.uid() <> old.from_id and (new.text is distinct from old.text or new.remind_at is distinct from old.remind_at) then
      raise exception 'Só quem criou o lembrete pode alterá-lo.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ───────────────────────── Hábitos e água (privados) ─────────────────────────
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  color text not null default '#059669' check (color ~ '^#[0-9a-fA-F]{6}$'),
  frequency text not null default 'diario' check (frequency in ('diario', 'dias', 'semana')),
  week_days int[] not null default '{0,1,2,3,4,5,6}',
  times_per_week int not null default 3 check (times_per_week between 1 and 7),
  target numeric not null default 1 check (target > 0),
  unit text not null default 'vez',
  reminder_time time,
  show_in_agenda boolean not null default false,
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  habit_id uuid not null references public.habits on delete cascade,
  date date not null,
  value numeric not null default 1 check (value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, date)
);

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  date date not null default current_date,
  ml int not null check (ml <> 0 and ml between -5000 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists water_logs_owner_date on public.water_logs (owner_id, date);

create table if not exists public.personal_settings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() unique references public.profiles on delete cascade,
  water_goal_ml int not null default 2000 check (water_goal_ml between 250 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dono fixo e datas para as tabelas privadas.
create or replace function public.private_stamp() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.owner_id := auth.uid(); new.household_id := public.my_household(); end if;
    new.created_at := now();
  elsif new.owner_id is distinct from old.owner_id or new.household_id is distinct from old.household_id then
    raise exception 'Não é possível trocar o dono de um registro.';
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.habit_log_rules() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from public.habits where id = new.habit_id and owner_id = new.owner_id) then raise exception 'Hábito inválido.'; end if;
  return new;
end $$;

-- ───────────────────────── Políticas ─────────────────────────
alter table public.events enable row level security;
drop policy if exists events_sel on public.events;
create policy events_sel on public.events for select using (public.fin_can_read(household_id, owner_id, context));
drop policy if exists events_ins on public.events;
create policy events_ins on public.events for insert with check (household_id = public.my_household() and owner_id = auth.uid());
drop policy if exists events_upd on public.events;
create policy events_upd on public.events for update using (public.fin_can_write(household_id, owner_id, context)) with check (public.fin_can_write(household_id, owner_id, context));
drop policy if exists events_del on public.events;
create policy events_del on public.events for delete using (public.fin_can_write(household_id, owner_id, context));
drop trigger if exists a_stamp on public.events;
create trigger a_stamp before insert or update on public.events for each row execute function public.fin_stamp();
drop trigger if exists b_rules on public.events;
create trigger b_rules before insert or update on public.events for each row execute function public.event_rules();
drop trigger if exists z_audit on public.events;
create trigger z_audit after insert or update or delete on public.events for each row execute function public.audit();

alter table public.partner_reminders enable row level security;
drop policy if exists pr_sel on public.partner_reminders;
create policy pr_sel on public.partner_reminders for select using (household_id = public.my_household() and (from_id = auth.uid() or to_id = auth.uid()));
drop policy if exists pr_ins on public.partner_reminders;
create policy pr_ins on public.partner_reminders for insert with check (household_id = public.my_household() and from_id = auth.uid());
drop policy if exists pr_upd on public.partner_reminders;
create policy pr_upd on public.partner_reminders for update using (household_id = public.my_household() and (from_id = auth.uid() or to_id = auth.uid())) with check (household_id = public.my_household());
drop policy if exists pr_del on public.partner_reminders;
create policy pr_del on public.partner_reminders for delete using (from_id = auth.uid());
drop trigger if exists a_rules on public.partner_reminders;
create trigger a_rules before insert or update on public.partner_reminders for each row execute function public.partner_reminder_rules();

do $$
declare t text;
begin
  foreach t in array array['habits', 'habit_logs', 'water_logs', 'personal_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format('create policy %I on public.%I for all using (owner_id = auth.uid() and household_id = public.my_household()) with check (owner_id = auth.uid() and household_id = public.my_household())', t || '_own', t);
    execute format('drop trigger if exists a_stamp on public.%I', t);
    execute format('create trigger a_stamp before insert or update on public.%I for each row execute function public.private_stamp()', t);
  end loop;
end $$;
drop trigger if exists b_rules on public.habit_logs;
create trigger b_rules before insert or update on public.habit_logs for each row execute function public.habit_log_rules();

grant select, insert, update, delete on public.events, public.partner_reminders, public.habits, public.habit_logs, public.water_logs, public.personal_settings to authenticated;

do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['events', 'partner_reminders', 'habits', 'habit_logs', 'water_logs', 'personal_settings'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
