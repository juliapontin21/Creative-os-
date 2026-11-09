-- Central da Vida · Etapa 1 · Novembro/2026 (ciclo começa em 30/10)
-- Traz as contas fixas de novembro da Júlia PF e do Casal: despesas PAGAS em 09/11/2026; recebimentos ficam previstos.
-- Rode depois do etapa1-dados.sql. Pode rodar de novo: não duplica.
do $$
declare J uuid; H uuid; n int;
begin
  select id, household_id into J, H from public.profiles where lower(email) = 'juliapontin21@gmail.com';
  if J is null then raise exception 'Perfil da Júlia não encontrado.'; end if;

  -- As contas fixas de PF e Casal passam a começar em 05/11 (antes: 05/12).
  update public.recurrences set start_date = '2026-11-05'
  where household_id = H and start_date = '2026-12-05' and (import_key like 'casal-%' or import_key like 'jpf-%' or import_key like 'mpf-%');

  -- Lançamentos de novembro ligados a cada conta fixa (um por conta; o app não gera de novo).
  insert into public.transactions (household_id, owner_id, context, kind, status, amount_cents, amount_pending, description,
    competence_date, due_date, paid_date, account_id, card_id, category_id, client, payment_method, recurrence_id, import_key)
  select r.household_id, r.owner_id, r.context, r.kind,
    case when r.kind = 'despesa' and (r.import_key like 'casal-%' or r.import_key like 'jpf-%') then 'realizado' else 'previsto' end,
    r.amount_cents, r.amount_pending, r.description, '2026-11-05', '2026-11-05',
    case when r.kind = 'despesa' and (r.import_key like 'casal-%' or r.import_key like 'jpf-%') then date '2026-11-09' end,
    r.account_id, r.card_id, r.category_id, r.client, r.payment_method, r.id, r.import_key || '-2026-11'
  from public.recurrences r
  where r.household_id = H and r.archived_at is null and (r.import_key like 'casal-%' or r.import_key like 'jpf-%' or r.import_key like 'mpf-%')
  on conflict do nothing;
  get diagnostics n = row_count;
  raise notice '% lançamentos de novembro criados', n;
end $$;

select t.description as conta, case t.context when 'casal' then 'Casal' else 'PF' end as aba,
  to_char(t.amount_cents / 100.0, 'FM999G990D00') as valor, case t.status when 'realizado' then 'pago em 09/11' else 'previsto 05/11' end as situacao
from public.transactions t join public.profiles j on j.household_id = t.household_id and lower(j.email) = 'juliapontin21@gmail.com'
where t.import_key like '%-2026-11' order by t.context, t.kind, t.description;
