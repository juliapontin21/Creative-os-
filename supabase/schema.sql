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

-- ============ TikTok (rascunhos automáticos) ============
-- Conta do TikTok conectada. Sem políticas: só o servidor (chave de serviço) lê e grava.
create table if not exists public.tiktok_accounts (
  user_id uuid primary key references auth.users on delete cascade,
  open_id text,
  display_name text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  refresh_expires_at timestamptz,
  scope text,
  needs_reconnect boolean not null default false,
  connected_at timestamptz not null default now(),
  scan_since timestamptz not null default now(),
  last_scan timestamptz,
  last_sync timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);
alter table public.tiktok_accounts enable row level security;

-- Fila de vídeos encontrados nas pastas "Editado" do Drive e enviados como rascunho.
-- status: fila · enviando · no_tiktok · publicado · erro · ignorado · substituido
create table if not exists public.tiktok_drafts (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  drive_file_id text not null unique,
  file_name text not null,
  mime_type text,
  size bigint,
  folder_id text,
  video_code text,
  video_folder text,
  product text,
  drive_created_at timestamptz,
  caption text,
  caption_source text,
  status text not null default 'fila',
  publish_id text,
  attempts int not null default 0,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tiktok_drafts_user_status on public.tiktok_drafts (user_id, status);
alter table public.tiktok_drafts enable row level security;

-- ============ Meu Criativo (roteiros, takes, produtos dentro do Creative OS) ============
-- Um documento por item, no mesmo formato do antigo painel: col = coleção (videos, takes,
-- produtos, ideias, pedidos, semanas, insercoes, linguagem, estado, config), id = código (V012, T014...).
create table if not exists public.mc_docs (
  user_id uuid not null references auth.users on delete cascade,
  col text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, col, id)
);
alter table public.mc_docs enable row level security;
drop policy if exists "mc_docs: só a dona" on public.mc_docs;
create policy "mc_docs: só a dona" on public.mc_docs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Dona do Creative OS (usada quando o Claude grava pelo conector do Supabase, sem login).
create or replace function public.mc_owner() returns uuid
language sql stable security definer set search_path = public, auth as $$
  select coalesce(auth.uid(), (select user_id from public.google_tokens order by updated_at desc limit 1));
$$;

-- Junta campos num documento (cria se não existir). Usado pelo app e pelo Claude.
create or replace function public.mc_merge(p_col text, p_id text, p_patch jsonb) returns jsonb
language sql security definer set search_path = public as $$
  insert into public.mc_docs (user_id, col, id, data)
  values (public.mc_owner(), p_col, p_id, p_patch)
  on conflict (user_id, col, id) do update
    set data = public.mc_docs.data || excluded.data, updated_at = now()
  returning data;
$$;
revoke all on function public.mc_merge(text, text, jsonb) from public, anon;
grant execute on function public.mc_merge(text, text, jsonb) to authenticated, service_role;

-- Atualização ao vivo no app quando o Claude grava algo.
do $$ begin
  alter publication supabase_realtime add table public.mc_docs;
exception when others then null; end $$;
