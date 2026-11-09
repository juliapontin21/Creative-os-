-- Gerado a partir do Plano de Atualização App Vida (09/11/2026). Não cole chaves secretas aqui.
-- Datas: Empresa paga/recebe dia 30 (fevereiro = último dia); Júlia PF, Michelangelo PF e Casal dia 5.
-- Valores sem informação ficam como "a confirmar" (R$ 0, fora dos totais).
-- GRAVAÇÃO: rode só depois de conferir a prévia. Pode rodar de novo: o que já foi carregado não duplica.
-- Precisa do etapa1.sql antes.
create or replace function pg_temp.cdv_cat(h uuid, o uuid, sc text, par uuid, nm text, col text, bucket text) returns uuid language plpgsql as $f$
declare r uuid;
begin
  select id into r from public.categories where household_id = h and module = 'financas' and archived_at is null and scope = sc
    and lower(name) = lower(nm) and (sc = 'casal' or owner_id = o) and parent_id is not distinct from par limit 1;
  if r is null then
    select id into r from public.categories where household_id = h and module = 'financas' and archived_at is null and scope = sc
      and lower(name) = lower(nm) and (sc = 'casal' or owner_id = o) limit 1;
  end if;
  if r is null then
    insert into public.categories (household_id, owner_id, scope, module, parent_id, name, color, fin_bucket)
    values (h, o, sc, 'financas', par, nm, col, bucket) returning id into r;
  end if;
  return r;
end $f$;

do $$
declare
  J uuid; M uuid; H uuid;
  c_emp_rec uuid;
  c_marketing uuid;
  c_redes uuid;
  c_acertos uuid;
  c_emp_desp uuid;
  c_contab uuid;
  c_impostos uuid;
  c_ferramentas uuid;
  c_cursos uuid;
  c_prestadores uuid;
  c_equip uuid;
  c_munique uuid;
  c_j_rec uuid;
  c_prolabore uuid;
  c_ressarc uuid;
  c_aluguel_vaga uuid;
  c_j_fixos uuid;
  c_consorcio uuid;
  c_beleza uuid;
  c_saude uuid;
  c_terapia uuid;
  c_m_fixos uuid;
  c_m_internet uuid;
  c_m_celular uuid;
  c_casa_fixos uuid;
  c_aluguel uuid;
  c_agua uuid;
  c_luz uuid;
  c_gas uuid;
  c_internet_tv uuid;
  c_mercado uuid;
  c_ingles uuid;
  c_lazer uuid;
  c_ifood uuid;
  c_passeios uuid;
  c_uber_lazer uuid;
  c_transporte uuid;
  c_uber_trab uuid;
  r_rc_frango_arroz_legumes uuid;
  r_rc_carne_arroz_abobrinha uuid;
  r_rc_macarrao_frango uuid;
  r_rc_hamburguer uuid;
  r_rc_pizza_atum uuid;
  r_rc_caesar_frango uuid;
  r_rc_arroz_frango uuid;
  r_rc_cafe_julia uuid;
  r_rc_cafe_mi uuid;
  r_rc_cha uuid;
begin
  select id, household_id into J, H from public.profiles where lower(email) = 'juliapontin21@gmail.com';
  if J is null then raise exception 'Perfil da Júlia não encontrado.'; end if;
  select id into M from public.profiles where household_id = H and id <> J limit 1;
  if M is null then raise exception 'O Michelangelo ainda não entrou no app. Peça para ele entrar uma vez e rode de novo.'; end if;

  -- Categorias (reaproveita as que já existem com o mesmo nome)
  c_emp_rec := pg_temp.cdv_cat(H, J, 'pessoal', null, 'Empresa · Receitas', '#15803d', null);
  c_marketing := pg_temp.cdv_cat(H, J, 'pessoal', c_emp_rec, 'Marketing', '#16a34a', null);
  c_redes := pg_temp.cdv_cat(H, J, 'pessoal', c_emp_rec, 'Gestão de redes sociais', '#059669', null);
  c_acertos := pg_temp.cdv_cat(H, J, 'pessoal', c_emp_rec, 'Acertos / valores a receber', '#0d9488', null);
  c_emp_desp := pg_temp.cdv_cat(H, J, 'pessoal', null, 'Empresa · Despesas', '#b91c1c', null);
  c_contab := pg_temp.cdv_cat(H, J, 'pessoal', c_emp_desp, 'Contabilidade', '#dc2626', 'fixo');
  c_impostos := pg_temp.cdv_cat(H, J, 'pessoal', c_emp_desp, 'Impostos', '#991b1b', 'imposto');
  c_ferramentas := pg_temp.cdv_cat(H, J, 'pessoal', c_emp_desp, 'Ferramentas e sistemas', '#ea580c', 'fixo');
  c_cursos := pg_temp.cdv_cat(H, J, 'pessoal', c_emp_desp, 'Cursos e capacitação', '#d97706', null);
  c_prestadores := pg_temp.cdv_cat(H, J, 'pessoal', c_emp_desp, 'Prestadores', '#c2410c', null);
  c_equip := pg_temp.cdv_cat(H, J, 'pessoal', c_emp_desp, 'Equipamentos / telefonia', '#9a3412', 'fixo');
  c_munique := pg_temp.cdv_cat(H, J, 'pessoal', c_emp_desp, 'Pagamento Munique', '#7c2d12', null);
  c_j_rec := pg_temp.cdv_cat(H, J, 'pessoal', null, 'Recebimentos', '#15803d', null);
  c_prolabore := pg_temp.cdv_cat(H, J, 'pessoal', c_j_rec, 'Pró-labore', '#16a34a', null);
  c_ressarc := pg_temp.cdv_cat(H, J, 'pessoal', c_j_rec, 'Ressarcimentos', '#0d9488', null);
  c_aluguel_vaga := pg_temp.cdv_cat(H, J, 'pessoal', c_j_rec, 'Renda de aluguel', '#059669', null);
  c_j_fixos := pg_temp.cdv_cat(H, J, 'pessoal', null, 'Custos fixos', '#7c3aed', 'fixo');
  c_consorcio := pg_temp.cdv_cat(H, J, 'pessoal', c_j_fixos, 'Consórcio', '#6d28d9', 'fixo');
  c_beleza := pg_temp.cdv_cat(H, J, 'pessoal', null, 'Beleza', '#db2777', null);
  c_saude := pg_temp.cdv_cat(H, J, 'pessoal', null, 'Saúde', '#0891b2', null);
  c_terapia := pg_temp.cdv_cat(H, J, 'pessoal', c_saude, 'Terapia', '#0e7490', null);
  c_m_fixos := pg_temp.cdv_cat(H, M, 'pessoal', null, 'Custos fixos', '#2563eb', 'fixo');
  c_m_internet := pg_temp.cdv_cat(H, M, 'pessoal', c_m_fixos, 'Plano de internet celular', '#1d4ed8', 'fixo');
  c_m_celular := pg_temp.cdv_cat(H, M, 'pessoal', c_m_fixos, 'Parcela do celular (Júlia)', '#1e40af', 'fixo');
  c_casa_fixos := pg_temp.cdv_cat(H, J, 'casal', null, 'Casa · Fixos', '#7c3aed', 'fixo');
  c_aluguel := pg_temp.cdv_cat(H, J, 'casal', c_casa_fixos, 'Aluguel', '#6d28d9', 'fixo');
  c_agua := pg_temp.cdv_cat(H, J, 'casal', c_casa_fixos, 'Água', '#0284c7', 'fixo');
  c_luz := pg_temp.cdv_cat(H, J, 'casal', c_casa_fixos, 'Luz', '#ca8a04', 'fixo');
  c_gas := pg_temp.cdv_cat(H, J, 'casal', c_casa_fixos, 'Gás', '#ea580c', 'fixo');
  c_internet_tv := pg_temp.cdv_cat(H, J, 'casal', c_casa_fixos, 'Internet e TV', '#4f46e5', 'fixo');
  c_mercado := pg_temp.cdv_cat(H, J, 'casal', c_casa_fixos, 'Alimentação / mercado', '#16a34a', 'fixo');
  c_ingles := pg_temp.cdv_cat(H, J, 'casal', c_casa_fixos, 'Curso de inglês', '#9333ea', 'fixo');
  c_lazer := pg_temp.cdv_cat(H, J, 'casal', null, 'Lazer', '#db2777', 'lazer');
  c_ifood := pg_temp.cdv_cat(H, J, 'casal', c_lazer, 'iFood e delivery', '#e11d48', 'lazer');
  c_passeios := pg_temp.cdv_cat(H, J, 'casal', c_lazer, 'Passeios e saídas', '#be185d', 'lazer');
  c_uber_lazer := pg_temp.cdv_cat(H, J, 'casal', c_lazer, 'Uber lazer', '#831843', 'lazer');
  c_transporte := pg_temp.cdv_cat(H, J, 'casal', null, 'Transporte', '#475569', null);
  c_uber_trab := pg_temp.cdv_cat(H, J, 'casal', c_transporte, 'Uber trabalho', '#334155', null);

  -- Contas fixas, recebimentos recorrentes e assinaturas (o app gera os meses ao abrir)
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'receita', 'Academia dos Resíduos (QLS)', 175000, false, 'mensal', '2026-11-05', null, c_marketing, 'Academia dos Resíduos (QLS)', 'outro', false, 'emp-rec-qls') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'receita', 'Vacaro Odontologia', 230000, false, 'mensal', '2026-11-30', null, c_redes, 'Vacaro Odontologia', 'outro', false, 'emp-rec-vacaro') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'receita', 'Dra. Natália Vieira', 165000, false, 'mensal', '2026-11-30', '2026-11-30', c_redes, 'Dra. Natália Vieira', 'outro', false, 'emp-rec-natalia') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'receita', 'Altair', 270000, false, 'mensal', '2026-11-30', null, c_redes, 'Altair', 'outro', false, 'emp-rec-altair') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'receita', 'Dona Preguiça', 100000, false, 'mensal', '2026-11-30', null, c_redes, 'Dona Preguiça', 'outro', false, 'emp-rec-donapreguica') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'receita', 'Leide', 90000, false, 'mensal', '2026-11-30', '2026-11-30', c_redes, 'Leide', 'outro', false, 'emp-rec-leide') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'receita', 'Jaqueline (consórcio)', 100000, false, 'mensal', '2026-11-30', null, c_redes, 'Jaqueline', 'outro', false, 'emp-rec-jaqueline') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'receita', 'Bruno Ferreira', 100000, false, 'mensal', '2026-11-30', null, c_redes, 'Bruno Ferreira', 'outro', false, 'emp-rec-bruno') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'despesa', 'Contabilidade', 20000, false, 'mensal', '2026-11-30', null, c_contab, '', 'outro', false, 'emp-desp-contab') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'despesa', 'Guia MEI', 8000, false, 'mensal', '2026-11-30', null, c_impostos, '', 'outro', false, 'emp-desp-mei') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'despesa', 'Plataforma de gestão de redes sociais', 12900, false, 'mensal', '2026-11-30', null, c_ferramentas, '', 'outro', true, 'emp-desp-plataforma') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'despesa', 'David — gestão de tráfego', 50000, false, 'mensal', '2026-11-30', null, c_prestadores, 'David', 'outro', false, 'emp-desp-david') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'despesa', 'Parcela celular Júlia', 55000, false, 'mensal', '2026-11-30', null, c_equip, '', 'outro', false, 'emp-desp-celular') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'despesa', 'Pagamento Munique', 0, true, 'mensal', '2026-11-30', null, c_munique, 'Munique', 'outro', false, 'emp-desp-munique') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'despesa', 'Claude (plano pago)', 0, true, 'mensal', '2026-11-30', null, c_ferramentas, '', 'outro', true, 'emp-sub-claude') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'despesa', 'ChatGPT (plano pago)', 0, true, 'mensal', '2026-11-30', null, c_ferramentas, '', 'outro', true, 'emp-sub-chatgpt') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'despesa', 'Profissão do Futuro — Rafaela Chagas', 5990, false, 'mensal', '2026-11-30', null, c_cursos, 'Rafaela Chagas', 'outro', true, 'emp-sub-profissao') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'empresa', 'despesa', 'Google Drive — armazenamento adicional', 4990, false, 'mensal', '2026-11-30', null, c_ferramentas, '', 'outro', true, 'emp-sub-drive') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'pf', 'receita', 'Michelangelo — parcela do celular', 30000, false, 'mensal', '2026-12-05', null, c_ressarc, 'Michelangelo', 'outro', false, 'jpf-rec-ressarc') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'pf', 'receita', 'Aluguel da vaga', 15000, false, 'mensal', '2026-12-05', null, c_aluguel_vaga, '', 'outro', false, 'jpf-rec-vaga') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'pf', 'despesa', 'Consórcio', 138000, false, 'mensal', '2026-12-05', null, c_consorcio, '', 'outro', false, 'jpf-desp-consorcio') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, M, 'pf', 'despesa', 'Plano de internet celular', 6000, false, 'mensal', '2026-12-05', null, c_m_internet, '', 'outro', false, 'mpf-desp-internet') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, M, 'pf', 'despesa', 'Parcela do celular (paga à Júlia)', 30000, false, 'mensal', '2026-12-05', null, c_m_celular, 'Júlia', 'outro', false, 'mpf-desp-celular') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'casal', 'despesa', 'Aluguel', 220233, false, 'mensal', '2026-12-05', null, c_aluguel, '', 'outro', false, 'casal-aluguel') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'casal', 'despesa', 'Água', 3000, false, 'mensal', '2026-12-05', null, c_agua, '', 'outro', false, 'casal-agua') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'casal', 'despesa', 'Luz', 17000, false, 'mensal', '2026-12-05', null, c_luz, '', 'outro', false, 'casal-luz') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'casal', 'despesa', 'Gás', 3000, false, 'mensal', '2026-12-05', null, c_gas, '', 'outro', false, 'casal-gas') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'casal', 'despesa', 'Internet e TV', 27000, false, 'mensal', '2026-12-05', null, c_internet_tv, '', 'outro', false, 'casal-internet') on conflict do nothing;
  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)
    values (H, J, 'casal', 'despesa', 'Curso de inglês', 14000, false, 'mensal', '2026-12-05', null, c_ingles, '', 'outro', true, 'casal-ingles') on conflict do nothing;

  -- Grazi: acerto de dívida em 2 parcelas (não é faturamento de serviço)
  insert into public.transactions (household_id, owner_id, context, kind, status, amount_cents, description, competence_date, due_date, category_id, client, payment_method, installment_group, installment_no, installment_total, import_key)
    values (H, J, 'empresa', 'receita', 'previsto', 170000, 'Grazi — acerto de dívida', '2026-11-30', '2026-11-30', c_acertos, 'Grazi', 'outro', md5('cdv-grazi')::uuid, 1, 2, 'emp-grazi-1') on conflict do nothing;
  insert into public.transactions (household_id, owner_id, context, kind, status, amount_cents, description, competence_date, due_date, category_id, client, payment_method, installment_group, installment_no, installment_total, import_key)
    values (H, J, 'empresa', 'receita', 'previsto', 170000, 'Grazi — acerto de dívida', '2026-12-30', '2026-12-30', c_acertos, 'Grazi', 'outro', md5('cdv-grazi')::uuid, 2, 2, 'emp-grazi-2') on conflict do nothing;

  -- Limites por mês (orçamento, não é lançamento)
  insert into public.budgets (household_id, owner_id, context, category_id, limit_cents) values (H, J, 'pf', c_beleza, 30000) on conflict do nothing;
  insert into public.budgets (household_id, owner_id, context, category_id, limit_cents) values (H, J, 'pf', c_terapia, 50000) on conflict do nothing;
  insert into public.budgets (household_id, owner_id, context, category_id, limit_cents) values (H, J, 'casal', c_mercado, 100000) on conflict do nothing;
  insert into public.budgets (household_id, owner_id, context, category_id, limit_cents) values (H, J, 'casal', c_lazer, 100000) on conflict do nothing;
  insert into public.budgets (household_id, owner_id, context, category_id, limit_cents) values (H, J, 'casal', c_uber_trab, 20000) on conflict do nothing;

  -- Caixinhas do casal: aporte mensal; meta total e saldo inicial a definir
  insert into public.goals (household_id, owner_id, context, name, kind, target_cents, monthly_cents, color, import_key) values (H, J, 'casal', 'Comprar o carro', 'desejo', 0, 100000, '#2563eb', 'casal-cx-carro') on conflict do nothing;
  insert into public.goals (household_id, owner_id, context, name, kind, target_cents, monthly_cents, color, import_key) values (H, J, 'casal', 'Reserva de emergência', 'reserva', 0, 50000, '#059669', 'casal-cx-emergencia') on conflict do nothing;
  insert into public.goals (household_id, owner_id, context, name, kind, target_cents, monthly_cents, color, import_key) values (H, J, 'casal', 'Reserva para viagens', 'desejo', 0, 50000, '#db2777', 'casal-cx-viagens') on conflict do nothing;
  insert into public.goals (household_id, owner_id, context, name, kind, target_cents, monthly_cents, color, import_key) values (H, J, 'casal', 'Imprevistos (presentes, reparos, inesperados)', 'reserva', 0, 20000, '#d97706', 'casal-cx-imprevistos') on conflict do nothing;

  -- Receitas do cardápio (sem calorias inventadas: preencha depois com rótulo/TACO)
  insert into public.recipes (household_id, owner_id, context, name, servings, ingredients, steps, import_key) values (H, J, 'casal', 'Frango, arroz e legumes', 2, '[{"name": "Frango", "qty": null, "unit": ""}, {"name": "Arroz", "qty": null, "unit": ""}, {"name": "Cenoura", "qty": null, "unit": ""}, {"name": "Abobrinha", "qty": null, "unit": ""}, {"name": "Brócolis", "qty": null, "unit": ""}, {"name": "Cebola", "qty": null, "unit": ""}, {"name": "Alho", "qty": null, "unit": ""}, {"name": "Temperos", "qty": null, "unit": ""}]'::jsonb, 'Porções iniciais (ajustáveis, não são prescrição): Júlia: proteína cozida 120–150 g, arroz cozido 100–130 g, legumes 150–250 g. Michelangelo: proteína 170–220 g, arroz 160–220 g, legumes 200–300 g.
Marmita: congelar porções prontas; salada fresca à parte, adicionada na hora.', 'rc-frango-arroz-legumes') on conflict do nothing;
  select id into r_rc_frango_arroz_legumes from public.recipes where household_id = H and import_key = 'rc-frango-arroz-legumes';
  insert into public.recipes (household_id, owner_id, context, name, servings, ingredients, steps, import_key) values (H, J, 'casal', 'Carne moída, arroz e abobrinha', 2, '[{"name": "Patinho / carne moída magra", "qty": null, "unit": ""}, {"name": "Arroz", "qty": null, "unit": ""}, {"name": "Abobrinha", "qty": null, "unit": ""}, {"name": "Cebola", "qty": null, "unit": ""}, {"name": "Alho", "qty": null, "unit": ""}, {"name": "Molho de tomate", "qty": null, "unit": ""}, {"name": "Temperos", "qty": null, "unit": ""}]'::jsonb, 'Porções iniciais (ajustáveis, não são prescrição): Júlia: proteína cozida 120–150 g, arroz cozido 100–130 g, legumes 150–250 g. Michelangelo: proteína 170–220 g, arroz 160–220 g, legumes 200–300 g.
Marmita: congelar porções prontas; salada fresca à parte.', 'rc-carne-arroz-abobrinha') on conflict do nothing;
  select id into r_rc_carne_arroz_abobrinha from public.recipes where household_id = H and import_key = 'rc-carne-arroz-abobrinha';
  insert into public.recipes (household_id, owner_id, context, name, servings, ingredients, steps, import_key) values (H, J, 'casal', 'Macarrão com frango e molho', 2, '[{"name": "Macarrão", "qty": null, "unit": ""}, {"name": "Frango", "qty": null, "unit": ""}, {"name": "Molho de tomate", "qty": null, "unit": ""}, {"name": "Cebola", "qty": null, "unit": ""}, {"name": "Alho", "qty": null, "unit": ""}, {"name": "Temperos", "qty": null, "unit": ""}]'::jsonb, 'Porções iniciais (ajustáveis, não são prescrição): Júlia: macarrão cozido 120–160 g, proteína 120–150 g. Michelangelo: macarrão cozido 180–240 g, proteína 170–220 g.
Marmita: congelar porções prontas; salada fresca à parte.', 'rc-macarrao-frango') on conflict do nothing;
  select id into r_rc_macarrao_frango from public.recipes where household_id = H and import_key = 'rc-macarrao-frango';
  insert into public.recipes (household_id, owner_id, context, name, servings, ingredients, steps, import_key) values (H, J, 'casal', 'Hambúrguer caseiro', 2, '[{"name": "Patinho moído", "qty": null, "unit": ""}, {"name": "Pão de hambúrguer", "qty": null, "unit": ""}, {"name": "Alface", "qty": null, "unit": ""}, {"name": "Tomate", "qty": null, "unit": ""}, {"name": "Muçarela", "qty": null, "unit": ""}, {"name": "Temperos", "qty": null, "unit": ""}]'::jsonb, 'Porções iniciais (ajustáveis, não são prescrição): Patinho cru: Júlia 120 g; Michelangelo 170–200 g.', 'rc-hamburguer') on conflict do nothing;
  select id into r_rc_hamburguer from public.recipes where household_id = H and import_key = 'rc-hamburguer';
  insert into public.recipes (household_id, owner_id, context, name, servings, ingredients, steps, import_key) values (H, J, 'casal', 'Pizza de atum', 1, '[{"name": "Base individual de pizza", "qty": 1, "unit": "un"}, {"name": "Atum", "qty": null, "unit": ""}, {"name": "Molho de tomate", "qty": null, "unit": ""}, {"name": "Muçarela", "qty": null, "unit": ""}, {"name": "Cebola", "qty": null, "unit": ""}]'::jsonb, 'Porções iniciais (ajustáveis, não são prescrição): Atum drenado: 70–90 g (Júlia).', 'rc-pizza-atum') on conflict do nothing;
  select id into r_rc_pizza_atum from public.recipes where household_id = H and import_key = 'rc-pizza-atum';
  insert into public.recipes (household_id, owner_id, context, name, servings, ingredients, steps, import_key) values (H, J, 'casal', 'Caesar com frango', 1, '[{"name": "Alface", "qty": null, "unit": ""}, {"name": "Frango", "qty": null, "unit": ""}, {"name": "Muçarela", "qty": null, "unit": ""}, {"name": "Limão", "qty": null, "unit": ""}, {"name": "Azeite", "qty": null, "unit": ""}]'::jsonb, 'Porções iniciais (ajustáveis, não são prescrição): Proteína do Michelangelo: 170–220 g.', 'rc-caesar-frango') on conflict do nothing;
  select id into r_rc_caesar_frango from public.recipes where household_id = H and import_key = 'rc-caesar-frango';
  insert into public.recipes (household_id, owner_id, context, name, servings, ingredients, steps, import_key) values (H, J, 'casal', 'Arroz com frango', 1, '[{"name": "Arroz", "qty": null, "unit": ""}, {"name": "Frango", "qty": null, "unit": ""}, {"name": "Cenoura", "qty": null, "unit": ""}, {"name": "Cebola", "qty": null, "unit": ""}, {"name": "Alho", "qty": null, "unit": ""}, {"name": "Temperos", "qty": null, "unit": ""}]'::jsonb, 'Porções iniciais (ajustáveis, não são prescrição): Michelangelo: proteína 170–220 g, arroz 160–220 g.', 'rc-arroz-frango') on conflict do nothing;
  select id into r_rc_arroz_frango from public.recipes where household_id = H and import_key = 'rc-arroz-frango';
  insert into public.recipes (household_id, owner_id, context, name, servings, ingredients, steps, import_key) values (H, J, 'casal', 'Café da manhã da Júlia', 1, '[{"name": "Iogurte", "qty": 1, "unit": "un"}, {"name": "Uvas", "qty": null, "unit": ""}, {"name": "Chia", "qty": 5, "unit": "g"}, {"name": "Linhaça", "qty": 5, "unit": "g"}, {"name": "Cappuccino", "qty": 1, "unit": "porção"}]'::jsonb, 'Opcional conforme fome e meta: 1 ovo ou 1 fatia de pão na chapa. Conferir o rótulo do iogurte.', 'rc-cafe-julia') on conflict do nothing;
  select id into r_rc_cafe_julia from public.recipes where household_id = H and import_key = 'rc-cafe-julia';
  insert into public.recipes (household_id, owner_id, context, name, servings, ingredients, steps, import_key) values (H, J, 'casal', 'Café da manhã do Michelangelo', 1, '[{"name": "Ovos", "qty": null, "unit": ""}, {"name": "Pão", "qty": null, "unit": ""}, {"name": "Fruta", "qty": null, "unit": ""}]'::jsonb, 'Alternativa quando for prático: iogurte proteico + aveia.', 'rc-cafe-mi') on conflict do nothing;
  select id into r_rc_cafe_mi from public.recipes where household_id = H and import_key = 'rc-cafe-mi';
  insert into public.recipes (household_id, owner_id, context, name, servings, ingredients, steps, import_key) values (H, J, 'casal', 'Chá de camomila com mel', 1, '[{"name": "Chá de camomila", "qty": 1, "unit": "sachê"}, {"name": "Mel", "qty": 1, "unit": "colher de chá"}]'::jsonb, 'Opcional, antes de dormir.', 'rc-cha') on conflict do nothing;
  select id into r_rc_cha from public.recipes where household_id = H and import_key = 'rc-cha';

  -- Cardápio 10–23/11/2026 (Júlia e Michelangelo)
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-10', 'cafe', r_rc_cafe_julia, '', 'mp-2026-11-10-J-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-10', 'almoco', r_rc_frango_arroz_legumes, '', 'mp-2026-11-10-J-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-10', 'lanche', null, 'Iogurte proteico + banana', 'mp-2026-11-10-J-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-10', 'jantar', r_rc_hamburguer, '', 'mp-2026-11-10-J-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-10', 'cafe', r_rc_cafe_mi, '', 'mp-2026-11-10-M-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-10', 'almoco', r_rc_frango_arroz_legumes, '', 'mp-2026-11-10-M-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-10', 'lanche', null, 'Iogurte proteico + banana', 'mp-2026-11-10-M-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-10', 'jantar', r_rc_hamburguer, '', 'mp-2026-11-10-M-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-11', 'cafe', r_rc_cafe_julia, '', 'mp-2026-11-11-J-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-11', 'almoco', r_rc_frango_arroz_legumes, '', 'mp-2026-11-11-J-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-11', 'lanche', null, 'Whey ou iogurte + fruta', 'mp-2026-11-11-J-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-11', 'jantar', r_rc_pizza_atum, '', 'mp-2026-11-11-J-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-11', 'cafe', r_rc_cafe_mi, '', 'mp-2026-11-11-M-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-11', 'almoco', r_rc_frango_arroz_legumes, '', 'mp-2026-11-11-M-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-11', 'lanche', null, 'Whey ou iogurte + fruta', 'mp-2026-11-11-M-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-11', 'jantar', r_rc_caesar_frango, '', 'mp-2026-11-11-M-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-12', 'cafe', r_rc_cafe_julia, '', 'mp-2026-11-12-J-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-12', 'almoco', r_rc_carne_arroz_abobrinha, '', 'mp-2026-11-12-J-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-12', 'lanche', null, 'Iogurte proteico + fruta', 'mp-2026-11-12-J-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-12', 'jantar', r_rc_hamburguer, '', 'mp-2026-11-12-J-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-12', 'cafe', r_rc_cafe_mi, '', 'mp-2026-11-12-M-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-12', 'almoco', r_rc_carne_arroz_abobrinha, '', 'mp-2026-11-12-M-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-12', 'lanche', null, 'Iogurte proteico + fruta', 'mp-2026-11-12-M-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-12', 'jantar', r_rc_arroz_frango, '', 'mp-2026-11-12-M-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-13', 'cafe', r_rc_cafe_julia, '', 'mp-2026-11-13-J-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-13', 'almoco', r_rc_carne_arroz_abobrinha, '', 'mp-2026-11-13-J-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-13', 'lanche', null, 'Whey + banana', 'mp-2026-11-13-J-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-13', 'jantar', r_rc_pizza_atum, '', 'mp-2026-11-13-J-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-13', 'cafe', r_rc_cafe_mi, '', 'mp-2026-11-13-M-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-13', 'almoco', r_rc_carne_arroz_abobrinha, '', 'mp-2026-11-13-M-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-13', 'lanche', null, 'Whey + banana', 'mp-2026-11-13-M-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-13', 'jantar', r_rc_caesar_frango, '', 'mp-2026-11-13-M-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-14', 'cafe', r_rc_cafe_julia, '', 'mp-2026-11-14-J-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-14', 'almoco', r_rc_macarrao_frango, '', 'mp-2026-11-14-J-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-14', 'lanche', null, 'Iogurte proteico + fruta', 'mp-2026-11-14-J-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-14', 'jantar', r_rc_hamburguer, '', 'mp-2026-11-14-J-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-14', 'cafe', r_rc_cafe_mi, '', 'mp-2026-11-14-M-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-14', 'almoco', r_rc_macarrao_frango, '', 'mp-2026-11-14-M-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-14', 'lanche', null, 'Iogurte proteico + fruta', 'mp-2026-11-14-M-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-14', 'jantar', r_rc_hamburguer, '', 'mp-2026-11-14-M-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-15', 'cafe', r_rc_cafe_julia, '', 'mp-2026-11-15-J-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-15', 'almoco', r_rc_macarrao_frango, '', 'mp-2026-11-15-J-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-15', 'lanche', null, 'Whey ou iogurte + fruta', 'mp-2026-11-15-J-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-15', 'jantar', r_rc_pizza_atum, '', 'mp-2026-11-15-J-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-15', 'cafe', r_rc_cafe_mi, '', 'mp-2026-11-15-M-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-15', 'almoco', r_rc_macarrao_frango, '', 'mp-2026-11-15-M-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-15', 'lanche', null, 'Whey ou iogurte + fruta', 'mp-2026-11-15-M-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-15', 'jantar', r_rc_arroz_frango, '', 'mp-2026-11-15-M-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-16', 'cafe', r_rc_cafe_julia, '', 'mp-2026-11-16-J-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-16', 'almoco', r_rc_frango_arroz_legumes, '', 'mp-2026-11-16-J-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-16', 'lanche', null, 'Iogurte proteico + banana', 'mp-2026-11-16-J-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-16', 'jantar', r_rc_hamburguer, '', 'mp-2026-11-16-J-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-16', 'cafe', r_rc_cafe_mi, '', 'mp-2026-11-16-M-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-16', 'almoco', r_rc_frango_arroz_legumes, '', 'mp-2026-11-16-M-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-16', 'lanche', null, 'Iogurte proteico + banana', 'mp-2026-11-16-M-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-16', 'jantar', r_rc_caesar_frango, '', 'mp-2026-11-16-M-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-17', 'cafe', r_rc_cafe_julia, '', 'mp-2026-11-17-J-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-17', 'almoco', r_rc_frango_arroz_legumes, '', 'mp-2026-11-17-J-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-17', 'lanche', null, 'Whey ou iogurte + fruta', 'mp-2026-11-17-J-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-17', 'jantar', r_rc_hamburguer, '', 'mp-2026-11-17-J-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-17', 'cafe', r_rc_cafe_mi, '', 'mp-2026-11-17-M-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-17', 'almoco', r_rc_frango_arroz_legumes, '', 'mp-2026-11-17-M-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-17', 'lanche', null, 'Whey ou iogurte + fruta', 'mp-2026-11-17-M-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-17', 'jantar', r_rc_hamburguer, '', 'mp-2026-11-17-M-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-18', 'cafe', r_rc_cafe_julia, '', 'mp-2026-11-18-J-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-18', 'almoco', r_rc_carne_arroz_abobrinha, '', 'mp-2026-11-18-J-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-18', 'lanche', null, 'Iogurte proteico + fruta', 'mp-2026-11-18-J-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-18', 'jantar', r_rc_pizza_atum, '', 'mp-2026-11-18-J-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-18', 'cafe', r_rc_cafe_mi, '', 'mp-2026-11-18-M-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-18', 'almoco', r_rc_carne_arroz_abobrinha, '', 'mp-2026-11-18-M-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-18', 'lanche', null, 'Iogurte proteico + fruta', 'mp-2026-11-18-M-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-18', 'jantar', r_rc_caesar_frango, '', 'mp-2026-11-18-M-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-19', 'cafe', r_rc_cafe_julia, '', 'mp-2026-11-19-J-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-19', 'almoco', r_rc_carne_arroz_abobrinha, '', 'mp-2026-11-19-J-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-19', 'lanche', null, 'Whey + banana', 'mp-2026-11-19-J-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-19', 'jantar', r_rc_hamburguer, '', 'mp-2026-11-19-J-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-19', 'cafe', r_rc_cafe_mi, '', 'mp-2026-11-19-M-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-19', 'almoco', r_rc_carne_arroz_abobrinha, '', 'mp-2026-11-19-M-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-19', 'lanche', null, 'Whey + banana', 'mp-2026-11-19-M-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-19', 'jantar', r_rc_arroz_frango, '', 'mp-2026-11-19-M-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-20', 'cafe', r_rc_cafe_julia, '', 'mp-2026-11-20-J-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-20', 'almoco', r_rc_macarrao_frango, '', 'mp-2026-11-20-J-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-20', 'lanche', null, 'Iogurte proteico + fruta', 'mp-2026-11-20-J-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-20', 'jantar', r_rc_pizza_atum, '', 'mp-2026-11-20-J-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-20', 'cafe', r_rc_cafe_mi, '', 'mp-2026-11-20-M-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-20', 'almoco', r_rc_macarrao_frango, '', 'mp-2026-11-20-M-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-20', 'lanche', null, 'Iogurte proteico + fruta', 'mp-2026-11-20-M-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-20', 'jantar', r_rc_caesar_frango, '', 'mp-2026-11-20-M-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-21', 'cafe', r_rc_cafe_julia, '', 'mp-2026-11-21-J-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-21', 'almoco', r_rc_macarrao_frango, '', 'mp-2026-11-21-J-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-21', 'lanche', null, 'Whey ou iogurte + fruta', 'mp-2026-11-21-J-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-21', 'jantar', r_rc_hamburguer, '', 'mp-2026-11-21-J-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-21', 'cafe', r_rc_cafe_mi, '', 'mp-2026-11-21-M-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-21', 'almoco', r_rc_macarrao_frango, '', 'mp-2026-11-21-M-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-21', 'lanche', null, 'Whey ou iogurte + fruta', 'mp-2026-11-21-M-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-21', 'jantar', r_rc_hamburguer, '', 'mp-2026-11-21-M-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-22', 'cafe', r_rc_cafe_julia, '', 'mp-2026-11-22-J-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-22', 'almoco', r_rc_frango_arroz_legumes, '', 'mp-2026-11-22-J-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-22', 'lanche', null, 'Iogurte proteico + banana', 'mp-2026-11-22-J-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-22', 'jantar', r_rc_pizza_atum, '', 'mp-2026-11-22-J-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-22', 'cafe', r_rc_cafe_mi, '', 'mp-2026-11-22-M-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-22', 'almoco', r_rc_frango_arroz_legumes, '', 'mp-2026-11-22-M-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-22', 'lanche', null, 'Iogurte proteico + banana', 'mp-2026-11-22-M-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-22', 'jantar', r_rc_arroz_frango, '', 'mp-2026-11-22-M-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-23', 'cafe', r_rc_cafe_julia, '', 'mp-2026-11-23-J-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-23', 'almoco', r_rc_frango_arroz_legumes, '', 'mp-2026-11-23-J-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-23', 'lanche', null, 'Whey ou iogurte + fruta', 'mp-2026-11-23-J-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, J, 'pf', '2026-11-23', 'jantar', r_rc_hamburguer, '', 'mp-2026-11-23-J-jantar') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-23', 'cafe', r_rc_cafe_mi, '', 'mp-2026-11-23-M-cafe') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-23', 'almoco', r_rc_frango_arroz_legumes, '', 'mp-2026-11-23-M-almoco') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-23', 'lanche', null, 'Whey ou iogurte + fruta', 'mp-2026-11-23-M-lanche') on conflict do nothing;
  insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, M, 'pf', '2026-11-23', 'jantar', r_rc_caesar_frango, '', 'mp-2026-11-23-M-jantar') on conflict do nothing;
end $$;

select 'Pronto! Abra o app: as contas fixas aparecem em Finanças e o cardápio em Alimentação.' as resultado;
