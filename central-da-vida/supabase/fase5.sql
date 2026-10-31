-- Central da Vida · Fase 5 · Alimentação e mercado
-- Como usar: SQL Editor → New query, cole tudo e clique em Run (depois das fases anteriores).
-- Pode rodar de novo sem perder dados.
--
-- Receitas e lista de mercado: do casal (os dois veem e editam).
-- Cardápio e diário alimentar: de cada um (o outro VÊ, só o dono edita).
-- Meta de calorias: opcional e privada (em personal_settings).

alter table public.personal_settings add column if not exists kcal_goal int check (kcal_goal is null or kcal_goal between 500 and 10000);

-- ───────────────────────── Receitas (do casal) ─────────────────────────
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'casal' check (context = 'casal'),
  name text not null check (length(trim(name)) between 1 and 120),
  link text not null default '',
  photo_url text not null default '',
  category_ids uuid[] not null default '{}',
  servings numeric not null default 2 check (servings > 0),
  prep_minutes int check (prep_minutes is null or prep_minutes between 0 and 2880),
  kcal_per_serving int check (kcal_per_serving is null or kcal_per_serving between 0 and 10000),
  ingredients jsonb not null default '[]'::jsonb,
  steps text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Cardápio e diário (de cada um) ─────────────────────────
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'pf' check (context = 'pf'),
  date date not null,
  meal text not null check (meal in ('cafe', 'almoco', 'lanche', 'jantar')),
  recipe_id uuid references public.recipes on delete set null,
  text text not null default '',
  servings numeric not null default 1 check (servings > 0),
  kcal int check (kcal is null or kcal between 0 and 10000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recipe_id is not null or length(trim(text)) > 0)
);
create index if not exists meal_plans_owner_date on public.meal_plans (owner_id, date);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'pf' check (context = 'pf'),
  date date not null default current_date,
  meal text not null check (meal in ('cafe', 'almoco', 'lanche', 'jantar')),
  recipe_id uuid references public.recipes on delete set null,
  text text not null default '',
  servings numeric not null default 1 check (servings > 0),
  kcal int check (kcal is null or kcal between 0 and 10000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recipe_id is not null or length(trim(text)) > 0)
);
create index if not exists food_logs_owner_date on public.food_logs (owner_id, date);

-- ───────────────────────── Lista de mercado (do casal) ─────────────────────────
create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  context text not null default 'casal' check (context = 'casal'),
  name text not null check (length(trim(name)) between 1 and 80),
  qty numeric check (qty is null or qty > 0),
  unit text not null default '',
  category_id uuid references public.categories on delete set null,
  origin text not null default '',
  checked_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Políticas ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['recipes', 'meal_plans', 'food_logs', 'shopping_items'] loop
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

grant select, insert, update, delete on public.recipes, public.meal_plans, public.food_logs, public.shopping_items to authenticated;

do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['recipes', 'meal_plans', 'food_logs', 'shopping_items'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- ───────────────────────── Fotos das receitas (Supabase Storage) ─────────────────────────
-- Pasta "receitas", organizada por casa. Os dois enviam e apagam fotos da própria casa.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('receitas', 'receitas', true) on conflict (id) do nothing;
    drop policy if exists "receitas: enviar" on storage.objects;
    create policy "receitas: enviar" on storage.objects for insert to authenticated
      with check (bucket_id = 'receitas' and (storage.foldername(name))[1] = public.my_household()::text);
    drop policy if exists "receitas: apagar" on storage.objects;
    create policy "receitas: apagar" on storage.objects for delete to authenticated
      using (bucket_id = 'receitas' and (storage.foldername(name))[1] = public.my_household()::text);
  end if;
end $$;
