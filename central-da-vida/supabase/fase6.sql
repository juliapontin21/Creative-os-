-- Central da Vida · Fase 6 · Treinos e biblioteca
-- Como usar: SQL Editor → New query, cole tudo e clique em Run (depois das fases anteriores).
-- Pode rodar de novo sem perder dados.
--
-- Fichas, exercícios, histórico de treinos e biblioteca: de cada um (o outro VÊ, só o dono edita).

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'pf' check (context = 'pf'),
  name text not null check (length(trim(name)) between 1 and 80),
  week_days int[] not null default '{}',
  notes text not null default '',
  color text not null default '#ea580c' check (color ~ '^#[0-9a-fA-F]{6}$'),
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'pf' check (context = 'pf'),
  workout_id uuid not null references public.workouts on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  sets int check (sets is null or sets between 1 and 20),
  reps text not null default '',
  duration_sec int check (duration_sec is null or duration_sec between 1 and 14400),
  load_kg numeric check (load_kg is null or load_kg >= 0),
  rest_sec int check (rest_sec is null or rest_sec between 0 and 1800),
  notes text not null default '',
  demo_url text not null default '',
  photo_url text not null default '',
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'pf' check (context = 'pf'),
  workout_id uuid references public.workouts on delete set null,
  workout_name text not null default '',
  date date not null default current_date,
  minutes int check (minutes is null or minutes between 0 and 600),
  items jsonb not null default '[]'::jsonb,
  notes text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workout_sessions_owner_date on public.workout_sessions (owner_id, date);

create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'pf' check (context = 'pf'),
  title text not null check (length(trim(title)) between 1 and 160),
  kind text not null default 'podcast' check (kind in ('podcast', 'musica', 'playlist', 'video', 'documentario', 'serie', 'audiolivro', 'outro')),
  url text not null default '',
  category_id uuid references public.categories on delete set null,
  status text not null default 'quero' check (status in ('quero', 'andamento', 'concluido')),
  duration_min int check (duration_min is null or duration_min between 1 and 10000),
  notes text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Exercício e treino feito pertencem a uma ficha do mesmo dono.
create or replace function public.training_rules() returns trigger
language plpgsql as $$
begin
  if new.workout_id is not null and not exists (select 1 from public.workouts w where w.id = new.workout_id and w.owner_id = new.owner_id) then
    raise exception 'Ficha inválida.';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['workouts', 'exercises', 'workout_sessions', 'library_items'] loop
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
  end loop;
end $$;
drop trigger if exists b_rules on public.exercises;
create trigger b_rules before insert or update on public.exercises for each row execute function public.training_rules();
drop trigger if exists b_rules on public.workout_sessions;
create trigger b_rules before insert or update on public.workout_sessions for each row execute function public.training_rules();

grant select, insert, update, delete on public.workouts, public.exercises, public.workout_sessions, public.library_items to authenticated;

do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['workouts', 'exercises', 'workout_sessions', 'library_items'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- Fotos dos exercícios usam a mesma pasta de fotos (criada na Fase 5).
