-- Central da Vida · Novembro/2026 · Saldo em conta corrente e caixinhas
-- Regra normal: juntar as rendas, pagar as contas, separar as caixinhas e dividir o que sobra na proporção da renda
-- (= saldo em conta corrente de cada um). Novembro é um mês fora do normal:
--   Júlia sem renda (R$ 0) e saldo R$ 0; Michelangelo recebeu R$ 8.000 e fica com saldo R$ 300.
--   Caixinhas recebem R$ 4.373,85: Viagem R$ 1.000 (pescaria), Carro R$ 1.984,62, Emergência R$ 992,31, Imprevistos R$ 396,92.
--   Os R$ 674 da conta da Júlia: R$ 300 saldo do Michelangelo, R$ 200 Uber trabalho, R$ 174 Lazer (limites só deste mês).
-- Pode rodar de novo: não duplica. Rode de novo depois que o Michelangelo entrar no app para registrar a renda e o saldo dele.

alter table public.month_plans add column if not exists allowance_overrides jsonb not null default '{}'::jsonb;
alter table public.month_plans add column if not exists budget_overrides jsonb not null default '{}'::jsonb;

do $$
declare J uuid; M uuid; H uuid; inc jsonb; sal jsonb; bud jsonb := '{}'::jsonb; c uuid; g record;
begin
  select id, household_id into J, H from public.profiles where lower(email) = 'juliapontin21@gmail.com';
  if J is null then raise exception 'Perfil da Júlia não encontrado.'; end if;
  select id into M from public.profiles where household_id = H and id <> J limit 1;

  inc := jsonb_build_object(J::text, 0);
  sal := jsonb_build_object(J::text, 0);
  if M is not null then
    inc := inc || jsonb_build_object(M::text, 800000);
    sal := sal || jsonb_build_object(M::text, 30000);
  else
    raise notice 'O Michelangelo ainda não entrou no app: renda e saldo dele ficam para quando você rodar de novo.';
  end if;

  -- Limites só de novembro (os normais continuam R$ 1.000 Lazer e R$ 200 Uber trabalho).
  select id into c from public.categories where household_id = H and module = 'financas' and scope = 'casal' and archived_at is null and name = 'Lazer' limit 1;
  if c is not null then bud := bud || jsonb_build_object(c::text, 17400); end if;
  select id into c from public.categories where household_id = H and module = 'financas' and scope = 'casal' and archived_at is null and name = 'Uber trabalho' limit 1;
  if c is not null then bud := bud || jsonb_build_object(c::text, 20000); end if;

  insert into public.month_plans (household_id, owner_id, context, month, savings_cents, income_overrides, allowance_overrides, budget_overrides, notes)
  values (H, J, 'casal', '2026-11-01', 437385, inc, sal, bud,
    'Mês fora do normal: Júlia sem pró-labore. Michelangelo recebeu R$ 8.000 e pagou as contas da casa. Júlia pagou Empresa e custos pessoais. Os R$ 674 da conta da Júlia: R$ 300 para o saldo do Michelangelo, R$ 200 Uber trabalho, R$ 174 Lazer.')
  on conflict (household_id, month) do update set
    savings_cents = excluded.savings_cents,
    income_overrides = public.month_plans.income_overrides || excluded.income_overrides,
    allowance_overrides = public.month_plans.allowance_overrides || excluded.allowance_overrides,
    budget_overrides = public.month_plans.budget_overrides || excluded.budget_overrides,
    notes = excluded.notes;

  -- Aportes de novembro nas caixinhas do casal (09/11/2026).
  for g in select * from (values ('casal-cx-viagens', 100000, 'Novembro: pescaria na praia'), ('casal-cx-carro', 198462, 'Novembro'),
                                 ('casal-cx-emergencia', 99231, 'Novembro'), ('casal-cx-imprevistos', 39692, 'Novembro')) v(k, cents, note) loop
    insert into public.goal_moves (household_id, owner_id, context, goal_id, amount_cents, date, note)
    select H, J, 'casal', x.id, g.cents, '2026-11-09', g.note from public.goals x
    where x.household_id = H and x.import_key = g.k
      and not exists (select 1 from public.goal_moves m where m.goal_id = x.id and m.date = '2026-11-09' and m.amount_cents = g.cents);
  end loop;
end $$;

select x.name as caixinha, to_char(coalesce(sum(m.amount_cents), 0) / 100.0, 'FM999G990D00') as guardado
from public.goals x join public.profiles j on j.household_id = x.household_id and lower(j.email) = 'juliapontin21@gmail.com'
left join public.goal_moves m on m.goal_id = x.id
where x.import_key like 'casal-cx-%' group by x.name order by x.name;
