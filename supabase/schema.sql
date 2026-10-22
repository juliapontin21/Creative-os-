-- Creative OS · Fase 2 · cole tudo no SQL Editor do Supabase e clique em Run.

-- Coleções do app (uma linha por coleção por usuária: contents, takes, refs...)
create table if not exists public.os_docs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.os_docs enable row level security;
drop policy if exists "os_docs: só a dona" on public.os_docs;
create policy "os_docs: só a dona" on public.os_docs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Backup diário automático (o app grava uma cópia por dia)
create table if not exists public.os_backups (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  data jsonb not null
);
alter table public.os_backups enable row level security;
drop policy if exists "os_backups: só a dona" on public.os_backups;
create policy "os_backups: só a dona" on public.os_backups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Token do Google para o Drive. Sem políticas: só o servidor (chave de serviço) lê e grava.
create table if not exists public.google_tokens (
  user_id uuid primary key references auth.users on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);
alter table public.google_tokens enable row level security;
