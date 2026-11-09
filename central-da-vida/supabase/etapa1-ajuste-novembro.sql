-- Central da Vida · Ajuste de novembro/2026 (pedido em 09/11)
-- Renda do mês vem dos lançamentos do Casal ("renda de quem"): Júlia R$ 674, Michelangelo R$ 8.000.
-- Caixinhas de novembro (o que foi guardado de verdade): Carro R$ 3.000, Viagem R$ 1.000 (pescaria), Emergência R$ 172, Imprevistos R$ 0.
-- Limites só de novembro: Uber trabalho R$ 200, Lazer R$ 374. Saldo em conta corrente: Júlia R$ 0, Michelangelo R$ 300.
-- Metas: Júlia (PF) limpa (referências automáticas desligadas; limites e metas antigas arquivados, não apagados); Empresa só com a meta de impostos.
-- Pode rodar de novo: não duplica. Rode de novo depois que o Michelangelo entrar no app (liga a renda dele ao perfil).

alter table public.transactions add column if not exists income_of uuid references public.profiles on delete set null;
alter table public.month_plans add column if not exists allowance_overrides jsonb not null default '{}'::jsonb;
alter table public.month_plans add column if not exists budget_overrides jsonb not null default '{}'::jsonb;

do $$
declare J uuid; M uuid; H uuid; inc jsonb; sal jsonb; bud jsonb := '{}'::jsonb; c uuid; g record;
begin
  select id, household_id into J, H from public.profiles where lower(email) = 'juliapontin21@gmail.com';
  if J is null then raise exception 'Perfil da Júlia não encontrado.'; end if;
  select id into M from public.profiles where household_id = H and id <> J limit 1;
  if M is null then raise notice 'O Michelangelo ainda não entrou no app: a renda dele fica lançada no Casal e é ligada ao perfil quando você rodar de novo.'; end if;

  -- 1) Rendas de novembro lançadas no Casal.
  insert into public.transactions (household_id, owner_id, context, kind, status, amount_cents, description, competence_date, due_date, paid_date, payment_method, income_of, notes, import_key)
  values (H, J, 'casal', 'receita', 'realizado', 67400, 'Renda Júlia', '2026-11-01', '2026-11-01', '2026-11-01', 'pix', J, 'Recebido em 30/10 (ciclo de novembro).', 'casal-renda-julia-2026-11')
  on conflict do nothing;
  insert into public.transactions (household_id, owner_id, context, kind, status, amount_cents, description, competence_date, due_date, paid_date, payment_method, income_of, import_key)
  values (H, J, 'casal', 'receita', 'realizado', 800000, 'Renda Michelangelo', '2026-11-05', '2026-11-05', '2026-11-05', 'pix', M, 'casal-renda-michelangelo-2026-11')
  on conflict do nothing;
  if M is not null then
    update public.transactions set income_of = M where household_id = H and import_key = 'casal-renda-michelangelo-2026-11' and income_of is null;
  end if;

  -- 2) Caixinhas: troca a divisão anterior (09/11) pela nova.
  delete from public.goal_moves m using public.goals x
  where m.goal_id = x.id and x.household_id = H and m.date = '2026-11-09'
    and ((x.import_key = 'casal-cx-viagens' and m.amount_cents = 100000 and m.note = 'Novembro: pescaria na praia') or (x.import_key = 'casal-cx-carro' and m.amount_cents = 198462)
      or (x.import_key = 'casal-cx-emergencia' and m.amount_cents = 99231) or (x.import_key = 'casal-cx-imprevistos' and m.amount_cents = 39692));
  for g in select * from (values ('casal-cx-carro', 300000, 'Novembro'), ('casal-cx-viagens', 100000, 'Novembro: pescaria na praia (Michelangelo)'),
                                 ('casal-cx-emergencia', 17200, 'Novembro')) v(k, cents, note) loop
    insert into public.goal_moves (household_id, owner_id, context, goal_id, amount_cents, date, note)
    select H, J, 'casal', x.id, g.cents, '2026-11-09', g.note from public.goals x
    where x.household_id = H and x.import_key = g.k
      and not exists (select 1 from public.goal_moves m where m.goal_id = x.id and m.date = '2026-11-09' and m.amount_cents = g.cents);
  end loop;

  -- 3) Mês do casal de novembro.
  inc := jsonb_build_object(J::text, 67400);
  sal := jsonb_build_object(J::text, 0);
  if M is not null then inc := inc || jsonb_build_object(M::text, 800000); sal := sal || jsonb_build_object(M::text, 30000); end if;
  select id into c from public.categories where household_id = H and module = 'financas' and scope = 'casal' and archived_at is null and name = 'Lazer' limit 1;
  if c is not null then bud := bud || jsonb_build_object(c::text, 37400); end if;
  select id into c from public.categories where household_id = H and module = 'financas' and scope = 'casal' and archived_at is null and name = 'Uber trabalho' limit 1;
  if c is not null then bud := bud || jsonb_build_object(c::text, 20000); end if;
  insert into public.month_plans (household_id, owner_id, context, month, savings_cents, income_overrides, allowance_overrides, budget_overrides, notes)
  values (H, J, 'casal', '2026-11-01', 417200, inc, sal, bud,
    'Mês atípico: renda Júlia R$ 674 e Michelangelo R$ 8.000. Caixinhas: Carro 3.000, Viagem 1.000 (pescaria), Emergência 172, Imprevistos 0. Uber trabalho 200 e Lazer 374. Saldo em conta corrente: Júlia 0, Michelangelo 300.')
  on conflict (household_id, month) do update set
    savings_cents = excluded.savings_cents,
    income_overrides = public.month_plans.income_overrides || excluded.income_overrides,
    allowance_overrides = public.month_plans.allowance_overrides || excluded.allowance_overrides,
    budget_overrides = public.month_plans.budget_overrides || excluded.budget_overrides,
    notes = excluded.notes;

  -- 4) Metas: Empresa só com impostos; Júlia (PF) sem referências automáticas (ela cria as próprias metas).
  insert into public.house_rules (household_id, owner_id, context, params) values (H, J, 'empresa', '{"profit_on": false, "prolabore_on": false, "opex_on": false, "tax_on": true}')
  on conflict (household_id, context, (case when context = 'casal' then '00000000-0000-0000-0000-000000000000'::uuid else owner_id end))
  do update set params = public.house_rules.params || excluded.params;
  insert into public.house_rules (household_id, owner_id, context, params) values (H, J, 'pf', '{"r2_ind_on": false, "fixed_on": false, "leisure_on": false, "invest_on": false, "reserve_on": false, "fi_on": false}')
  on conflict (household_id, context, (case when context = 'casal' then '00000000-0000-0000-0000-000000000000'::uuid else owner_id end))
  do update set params = public.house_rules.params || excluded.params;
  update public.budgets set archived_at = now() where household_id = H and owner_id = J and context = 'pf' and archived_at is null;
  update public.goals set archived_at = now() where household_id = H and owner_id = J and context = 'pf' and archived_at is null;  -- arquiva (não apaga) as metas antigas da Júlia PF
end $$;

select 'Renda do casal em novembro' as item, to_char(sum(t.amount_cents) / 100.0, 'FM999G990D00') as valor
from public.transactions t join public.profiles j on j.household_id = t.household_id and lower(j.email) = 'juliapontin21@gmail.com'
where t.context = 'casal' and t.kind = 'receita' and t.import_key like 'casal-renda-%-2026-11'
union all
select 'Caixinha: ' || x.name, to_char(coalesce(sum(m.amount_cents) filter (where m.date between '2026-11-01' and '2026-11-30'), 0) / 100.0, 'FM999G990D00')
from public.goals x join public.profiles j on j.household_id = x.household_id and lower(j.email) = 'juliapontin21@gmail.com'
left join public.goal_moves m on m.goal_id = x.id
where x.import_key like 'casal-cx-%' group by x.name;
