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
