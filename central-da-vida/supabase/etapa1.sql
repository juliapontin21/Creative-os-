-- Central da Vida · Plano de Atualização · Etapa 1A (estrutura financeira)
-- Valor "a confirmar", chave de importação (evita duplicar), caixinhas com aporte mensal.
-- Pode rodar de novo sem problema. Não apaga nada.

-- Valor a confirmar: lançamento/conta fixa existe, mas o valor ainda não foi informado (fica R$ 0 e não entra nos totais).
alter table public.transactions add column if not exists amount_pending boolean not null default false;
alter table public.recurrences add column if not exists amount_pending boolean not null default false;
alter table public.transactions drop constraint if exists transactions_amount_cents_check;
alter table public.transactions drop constraint if exists transactions_amount_ok;
alter table public.transactions add constraint transactions_amount_ok check (amount_cents > 0 or (amount_pending and amount_cents = 0));
alter table public.recurrences drop constraint if exists recurrences_amount_cents_check;
alter table public.recurrences drop constraint if exists recurrences_amount_ok;
alter table public.recurrences add constraint recurrences_amount_ok check (amount_cents > 0 or (amount_pending and amount_cents = 0));

-- Chave estável de importação (perfil + origem + competência + tipo): rodar a carga duas vezes não duplica.
alter table public.transactions add column if not exists import_key text;
alter table public.recurrences add column if not exists import_key text;
alter table public.goals add column if not exists import_key text;
alter table public.recipes add column if not exists import_key text;
alter table public.meal_plans add column if not exists import_key text;
create unique index if not exists transactions_import_key on public.transactions (household_id, import_key) where import_key is not null;
create unique index if not exists recurrences_import_key on public.recurrences (household_id, import_key) where import_key is not null;
create unique index if not exists goals_import_key on public.goals (household_id, import_key) where import_key is not null;
create unique index if not exists recipes_import_key on public.recipes (household_id, import_key) where import_key is not null;
create unique index if not exists meal_plans_import_key on public.meal_plans (household_id, import_key) where import_key is not null;

-- Caixinhas: meta de aporte por mês; meta total opcional (0 = ainda não definida).
alter table public.goals add column if not exists monthly_cents bigint not null default 0 check (monthly_cents >= 0);
alter table public.goals drop constraint if exists goals_target_cents_check;
alter table public.goals drop constraint if exists goals_target_ok;
alter table public.goals add constraint goals_target_ok check (target_cents >= 0);
