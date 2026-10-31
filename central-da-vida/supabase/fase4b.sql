-- Central da Vida · Fase 4B · Notificações no celular
-- Como usar: SQL Editor → New query, cole tudo e clique em Run (depois das fases anteriores).
-- Pode rodar de novo sem perder dados.
--
-- O que este arquivo faz:
--  1. Cria as tabelas de aparelhos inscritos e de preferências (privadas de cada um).
--  2. Cria um segredo aleatório (guardado só no banco) que o servidor do app usa para conferir quem o chama.
--  3. Agenda uma rotina que, a cada minuto, chama o servidor do app para enviar as notificações devidas.

-- ───────────────────────── Aparelhos inscritos e preferências (privados) ─────────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_prefs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() unique references public.profiles on delete cascade,
  events boolean not null default true,
  partner_events boolean not null default true,
  partner_reminders boolean not null default true,
  habits boolean not null default true,
  water boolean not null default false,
  water_every_min int not null default 120 check (water_every_min between 30 and 480),
  finance boolean not null default true,
  finance_hour int not null default 9 check (finance_hour between 0 and 23),
  quiet_start int not null default 1320 check (quiet_start between 0 and 1439),
  quiet_end int not null default 420 check (quiet_end between 0 and 1439),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['push_subscriptions', 'notification_prefs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format('create policy %I on public.%I for all using (owner_id = auth.uid() and household_id = public.my_household()) with check (owner_id = auth.uid() and household_id = public.my_household())', t || '_own', t);
    execute format('drop trigger if exists a_stamp on public.%I', t);
    execute format('create trigger a_stamp before insert or update on public.%I for each row execute function public.private_stamp()', t);
  end loop;
end $$;
grant select, insert, update, delete on public.push_subscriptions, public.notification_prefs to authenticated;

-- Registro do que já foi enviado (evita notificação repetida). Só o servidor usa.
create table if not exists public.notification_log (
  key text primary key,
  sent_at timestamptz not null default now()
);
alter table public.notification_log enable row level security;
revoke all on public.notification_log from anon, authenticated;

-- ───────────────────────── Segredos do servidor ─────────────────────────
-- Ficam num esquema que o app não enxerga. Só o servidor (chave secreta do Supabase) lê, pelas funções abaixo.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.app_secrets (name text primary key, value text not null);
insert into private.app_secrets (name, value)
values ('cron_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

create or replace function public.get_app_secret(p_name text) returns text
language sql stable security definer set search_path = private, public as $$
  select value from private.app_secrets where name = p_name
$$;
create or replace function public.set_app_secret(p_name text, p_value text) returns void
language sql security definer set search_path = private, public as $$
  insert into private.app_secrets (name, value) values (p_name, p_value) on conflict (name) do nothing
$$;
revoke execute on function public.get_app_secret(text) from public, anon, authenticated;
revoke execute on function public.set_app_secret(text, text) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.get_app_secret(text) to service_role;
    grant execute on function public.set_app_secret(text, text) to service_role;
  end if;
end $$;

-- ───────────────────────── Rotina de cada minuto ─────────────────────────
-- Usa as extensões pg_cron e pg_net do Supabase (disponíveis no plano gratuito).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron;
    create extension if not exists pg_net with schema extensions;
    perform cron.schedule('central-da-vida-notificacoes', '* * * * *', $cmd$
      select net.http_post(
        url := 'https://central-da-vida-vert.vercel.app/api/push-dispatch',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select value from private.app_secrets where name = 'cron_secret')),
        body := '{}'::jsonb
      )
    $cmd$);
  else
    raise notice 'pg_cron/pg_net indisponíveis neste banco: rotina não agendada.';
  end if;
end $$;
