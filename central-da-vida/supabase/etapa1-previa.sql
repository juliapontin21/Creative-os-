-- Gerado a partir do Plano de Atualização App Vida (09/11/2026). Não cole chaves secretas aqui.
-- Datas: Empresa paga/recebe dia 30 (fevereiro = último dia); Júlia PF, Michelangelo PF e Casal dia 5.
-- Valores sem informação ficam como "a confirmar" (R$ 0, fora dos totais).
-- PRÉVIA: só lê o banco, não grava nada. Rode, confira a coluna "situacao" e me mande o resultado (ou um print).
create temp table cdv_previa (grupo text, chave text, aba text, item text, valor text, quando text, parecido text, tipo text, ctx text);
insert into cdv_previa values
('1 categoria', 'emp_rec', 'Júlia', 'Empresa · Receitas', '', '', 'Empresa · Receitas', 'cat', 'J'),
('1 categoria', 'marketing', 'Júlia', 'Empresa · Receitas › Marketing', '', '', 'Marketing', 'cat', 'J'),
('1 categoria', 'redes', 'Júlia', 'Empresa · Receitas › Gestão de redes sociais', '', '', 'Gestão de redes sociais', 'cat', 'J'),
('1 categoria', 'acertos', 'Júlia', 'Empresa · Receitas › Acertos / valores a receber', '', '', 'Acertos / valores a receber', 'cat', 'J'),
('1 categoria', 'emp_desp', 'Júlia', 'Empresa · Despesas', '', '', 'Empresa · Despesas', 'cat', 'J'),
('1 categoria', 'contab', 'Júlia', 'Empresa · Despesas › Contabilidade', '', '', 'Contabilidade', 'cat', 'J'),
('1 categoria', 'impostos', 'Júlia', 'Empresa · Despesas › Impostos', '', '', 'Impostos', 'cat', 'J'),
('1 categoria', 'ferramentas', 'Júlia', 'Empresa · Despesas › Ferramentas e sistemas', '', '', 'Ferramentas e sistemas', 'cat', 'J'),
('1 categoria', 'cursos', 'Júlia', 'Empresa · Despesas › Cursos e capacitação', '', '', 'Cursos e capacitação', 'cat', 'J'),
('1 categoria', 'prestadores', 'Júlia', 'Empresa · Despesas › Prestadores', '', '', 'Prestadores', 'cat', 'J'),
('1 categoria', 'equip', 'Júlia', 'Empresa · Despesas › Equipamentos / telefonia', '', '', 'Equipamentos / telefonia', 'cat', 'J'),
('1 categoria', 'munique', 'Júlia', 'Empresa · Despesas › Pagamento Munique', '', '', 'Pagamento Munique', 'cat', 'J'),
('1 categoria', 'j_rec', 'Júlia', 'Recebimentos', '', '', 'Recebimentos', 'cat', 'J'),
('1 categoria', 'prolabore', 'Júlia', 'Recebimentos › Pró-labore', '', '', 'Pró-labore', 'cat', 'J'),
('1 categoria', 'ressarc', 'Júlia', 'Recebimentos › Ressarcimentos', '', '', 'Ressarcimentos', 'cat', 'J'),
('1 categoria', 'aluguel_vaga', 'Júlia', 'Recebimentos › Renda de aluguel', '', '', 'Renda de aluguel', 'cat', 'J'),
('1 categoria', 'j_fixos', 'Júlia', 'Custos fixos', '', '', 'Custos fixos', 'cat', 'J'),
('1 categoria', 'consorcio', 'Júlia', 'Custos fixos › Consórcio', '', '', 'Consórcio', 'cat', 'J'),
('1 categoria', 'beleza', 'Júlia', 'Beleza', '', '', 'Beleza', 'cat', 'J'),
('1 categoria', 'saude', 'Júlia', 'Saúde', '', '', 'Saúde', 'cat', 'J'),
('1 categoria', 'terapia', 'Júlia', 'Saúde › Terapia', '', '', 'Terapia', 'cat', 'J'),
('1 categoria', 'm_fixos', 'Michelangelo', 'Custos fixos', '', '', 'Custos fixos', 'cat', 'M'),
('1 categoria', 'm_internet', 'Michelangelo', 'Custos fixos › Plano de internet celular', '', '', 'Plano de internet celular', 'cat', 'M'),
('1 categoria', 'm_celular', 'Michelangelo', 'Custos fixos › Parcela do celular (Júlia)', '', '', 'Parcela do celular (Júlia)', 'cat', 'M'),
('1 categoria', 'casa_fixos', 'Casal', 'Casa · Fixos', '', '', 'Casa · Fixos', 'cat', 'casal'),
('1 categoria', 'aluguel', 'Casal', 'Casa · Fixos › Aluguel', '', '', 'Aluguel', 'cat', 'casal'),
('1 categoria', 'agua', 'Casal', 'Casa · Fixos › Água', '', '', 'Água', 'cat', 'casal'),
('1 categoria', 'luz', 'Casal', 'Casa · Fixos › Luz', '', '', 'Luz', 'cat', 'casal'),
('1 categoria', 'gas', 'Casal', 'Casa · Fixos › Gás', '', '', 'Gás', 'cat', 'casal'),
('1 categoria', 'internet_tv', 'Casal', 'Casa · Fixos › Internet e TV', '', '', 'Internet e TV', 'cat', 'casal'),
('1 categoria', 'mercado', 'Casal', 'Casa · Fixos › Alimentação / mercado', '', '', 'Alimentação / mercado', 'cat', 'casal'),
('1 categoria', 'ingles', 'Casal', 'Casa · Fixos › Curso de inglês', '', '', 'Curso de inglês', 'cat', 'casal'),
('1 categoria', 'lazer', 'Casal', 'Lazer', '', '', 'Lazer', 'cat', 'casal'),
('1 categoria', 'ifood', 'Casal', 'Lazer › iFood e delivery', '', '', 'iFood e delivery', 'cat', 'casal'),
('1 categoria', 'passeios', 'Casal', 'Lazer › Passeios e saídas', '', '', 'Passeios e saídas', 'cat', 'casal'),
('1 categoria', 'uber_lazer', 'Casal', 'Lazer › Uber lazer', '', '', 'Uber lazer', 'cat', 'casal'),
('1 categoria', 'transporte', 'Casal', 'Transporte', '', '', 'Transporte', 'cat', 'casal'),
('1 categoria', 'uber_trab', 'Casal', 'Transporte › Uber trabalho', '', '', 'Uber trabalho', 'cat', 'casal'),
('2 conta fixa', 'emp-rec-qls', 'Empresa · Júlia', '↓ Academia dos Resíduos (QLS)', 'R$ 1.750,00', 'todo mês, a partir de 05/11', 'resíduos', 'rec', 'empresa'),
('2 conta fixa', 'emp-rec-vacaro', 'Empresa · Júlia', '↓ Vacaro Odontologia', 'R$ 2.300,00', 'todo mês, a partir de 30/11', 'vacaro', 'rec', 'empresa'),
('2 conta fixa', 'emp-rec-natalia', 'Empresa · Júlia', '↓ Dra. Natália Vieira', 'R$ 1.650,00', 'todo mês, a partir de 30/11 até 30/11/2026', 'natália', 'rec', 'empresa'),
('2 conta fixa', 'emp-rec-altair', 'Empresa · Júlia', '↓ Altair', 'R$ 2.700,00', 'todo mês, a partir de 30/11', 'altair', 'rec', 'empresa'),
('2 conta fixa', 'emp-rec-donapreguica', 'Empresa · Júlia', '↓ Dona Preguiça', 'R$ 1.000,00', 'todo mês, a partir de 30/11', 'preguiça', 'rec', 'empresa'),
('2 conta fixa', 'emp-rec-leide', 'Empresa · Júlia', '↓ Leide', 'R$ 900,00', 'todo mês, a partir de 30/11 até 30/11/2026', 'leide', 'rec', 'empresa'),
('2 conta fixa', 'emp-rec-jaqueline', 'Empresa · Júlia', '↓ Jaqueline (consórcio)', 'R$ 1.000,00', 'todo mês, a partir de 30/11', 'jaqueline', 'rec', 'empresa'),
('2 conta fixa', 'emp-rec-bruno', 'Empresa · Júlia', '↓ Bruno Ferreira', 'R$ 1.000,00', 'todo mês, a partir de 30/11', 'bruno', 'rec', 'empresa'),
('2 conta fixa', 'emp-desp-contab', 'Empresa · Júlia', '↑ Contabilidade', 'R$ 200,00', 'todo mês, a partir de 30/11', 'contab', 'rec', 'empresa'),
('2 conta fixa', 'emp-desp-mei', 'Empresa · Júlia', '↑ Guia MEI', 'R$ 80,00', 'todo mês, a partir de 30/11', 'mei', 'rec', 'empresa'),
('2 assinatura', 'emp-desp-plataforma', 'Empresa · Júlia', '↑ Plataforma de gestão de redes sociais', 'R$ 129,00', 'todo mês, a partir de 30/11', 'plataforma', 'rec', 'empresa'),
('2 conta fixa', 'emp-desp-david', 'Empresa · Júlia', '↑ David — gestão de tráfego', 'R$ 500,00', 'todo mês, a partir de 30/11', 'david', 'rec', 'empresa'),
('2 conta fixa', 'emp-desp-celular', 'Empresa · Júlia', '↑ Parcela celular Júlia', 'R$ 550,00', 'todo mês, a partir de 30/11', 'celular', 'rec', 'empresa'),
('2 conta fixa', 'emp-desp-munique', 'Empresa · Júlia', '↑ Pagamento Munique', 'a confirmar', 'todo mês, a partir de 30/11', 'munique', 'rec', 'empresa'),
('2 assinatura', 'emp-sub-claude', 'Empresa · Júlia', '↑ Claude (plano pago)', 'a confirmar', 'todo mês, a partir de 30/11', 'claude', 'rec', 'empresa'),
('2 assinatura', 'emp-sub-chatgpt', 'Empresa · Júlia', '↑ ChatGPT (plano pago)', 'a confirmar', 'todo mês, a partir de 30/11', 'chatgpt', 'rec', 'empresa'),
('2 assinatura', 'emp-sub-profissao', 'Empresa · Júlia', '↑ Profissão do Futuro — Rafaela Chagas', 'R$ 59,90', 'todo mês, a partir de 30/11', 'profissão', 'rec', 'empresa'),
('2 assinatura', 'emp-sub-drive', 'Empresa · Júlia', '↑ Google Drive — armazenamento adicional', 'R$ 49,90', 'todo mês, a partir de 30/11', 'drive', 'rec', 'empresa'),
('2 conta fixa', 'jpf-rec-ressarc', 'PF · Júlia', '↓ Michelangelo — parcela do celular', 'R$ 300,00', 'todo mês, a partir de 05/12', 'celular', 'rec', 'pf'),
('2 conta fixa', 'jpf-rec-vaga', 'PF · Júlia', '↓ Aluguel da vaga', 'R$ 150,00', 'todo mês, a partir de 05/12', 'vaga', 'rec', 'pf'),
('2 conta fixa', 'jpf-desp-consorcio', 'PF · Júlia', '↑ Consórcio', 'R$ 1.380,00', 'todo mês, a partir de 05/12', 'consórcio', 'rec', 'pf'),
('2 conta fixa', 'mpf-desp-internet', 'PF · Michelangelo', '↑ Plano de internet celular', 'R$ 60,00', 'todo mês, a partir de 05/12', 'internet', 'rec', 'pf'),
('2 conta fixa', 'mpf-desp-celular', 'PF · Michelangelo', '↑ Parcela do celular (paga à Júlia)', 'R$ 300,00', 'todo mês, a partir de 05/12', 'celular', 'rec', 'pf'),
('2 conta fixa', 'casal-aluguel', 'Casal · Júlia', '↑ Aluguel', 'R$ 2.202,33', 'todo mês, a partir de 05/12', 'aluguel', 'rec', 'casal'),
('2 conta fixa', 'casal-agua', 'Casal · Júlia', '↑ Água', 'R$ 30,00', 'todo mês, a partir de 05/12', 'água', 'rec', 'casal'),
('2 conta fixa', 'casal-luz', 'Casal · Júlia', '↑ Luz', 'R$ 170,00', 'todo mês, a partir de 05/12', 'luz', 'rec', 'casal'),
('2 conta fixa', 'casal-gas', 'Casal · Júlia', '↑ Gás', 'R$ 30,00', 'todo mês, a partir de 05/12', 'gás', 'rec', 'casal'),
('2 conta fixa', 'casal-internet', 'Casal · Júlia', '↑ Internet e TV', 'R$ 270,00', 'todo mês, a partir de 05/12', 'internet', 'rec', 'casal'),
('2 assinatura', 'casal-ingles', 'Casal · Júlia', '↑ Curso de inglês', 'R$ 140,00', 'todo mês, a partir de 05/12', 'inglês', 'rec', 'casal'),
('3 lançamento', 'emp-grazi-1', 'Empresa · Júlia', '↓ Grazi — acerto de dívida (1/2)', 'R$ 1.700,00', '30/11/2026', 'grazi', 'tx', 'empresa'),
('3 lançamento', 'emp-grazi-2', 'Empresa · Júlia', '↓ Grazi — acerto de dívida (2/2)', 'R$ 1.700,00', '30/12/2026', 'grazi', 'tx', 'empresa'),
('4 limite do mês', 'bud-pf-beleza', 'PF', 'Unhas e cílios', 'R$ 300,00', 'por mês', 'Beleza', 'bud', 'pf'),
('4 limite do mês', 'bud-pf-terapia', 'PF', 'Terapia (referência)', 'R$ 500,00', 'por mês', 'Terapia', 'bud', 'pf'),
('4 limite do mês', 'bud-casal-mercado', 'Casal', 'Alimentação / mercado', 'R$ 1.000,00', 'por mês', 'Alimentação / mercado', 'bud', 'casal'),
('4 limite do mês', 'bud-casal-lazer', 'Casal', 'Lazer (iFood, passeios, Uber lazer)', 'R$ 1.000,00', 'por mês', 'Lazer', 'bud', 'casal'),
('4 limite do mês', 'bud-casal-uber_trab', 'Casal', 'Uber trabalho', 'R$ 200,00', 'por mês', 'Uber trabalho', 'bud', 'casal'),
('5 caixinha', 'casal-cx-carro', 'Casal', 'Comprar o carro', 'R$ 1.000,00', 'aporte por mês · saldo inicial R$ 0', 'Comprar o carro', 'goal', 'casal'),
('5 caixinha', 'casal-cx-emergencia', 'Casal', 'Reserva de emergência', 'R$ 500,00', 'aporte por mês · saldo inicial R$ 0', 'Reserva de emergência', 'goal', 'casal'),
('5 caixinha', 'casal-cx-viagens', 'Casal', 'Reserva para viagens', 'R$ 500,00', 'aporte por mês · saldo inicial R$ 0', 'Reserva para viagens', 'goal', 'casal'),
('5 caixinha', 'casal-cx-imprevistos', 'Casal', 'Imprevistos (presentes, reparos, inesperados)', 'R$ 200,00', 'aporte por mês · saldo inicial R$ 0', 'Imprevistos (presentes, reparos, inesperados)', 'goal', 'casal'),
('6 receita', 'rc-frango-arroz-legumes', 'Casal', 'Frango, arroz e legumes', '', '', 'Frango, arroz e legumes', 'recipe', 'casal'),
('6 receita', 'rc-carne-arroz-abobrinha', 'Casal', 'Carne moída, arroz e abobrinha', '', '', 'Carne moída, arroz e abobrinha', 'recipe', 'casal'),
('6 receita', 'rc-macarrao-frango', 'Casal', 'Macarrão com frango e molho', '', '', 'Macarrão com frango e molho', 'recipe', 'casal'),
('6 receita', 'rc-hamburguer', 'Casal', 'Hambúrguer caseiro', '', '', 'Hambúrguer caseiro', 'recipe', 'casal'),
('6 receita', 'rc-pizza-atum', 'Casal', 'Pizza de atum', '', '', 'Pizza de atum', 'recipe', 'casal'),
('6 receita', 'rc-caesar-frango', 'Casal', 'Caesar com frango', '', '', 'Caesar com frango', 'recipe', 'casal'),
('6 receita', 'rc-arroz-frango', 'Casal', 'Arroz com frango', '', '', 'Arroz com frango', 'recipe', 'casal'),
('6 receita', 'rc-cafe-julia', 'Casal', 'Café da manhã da Júlia', '', '', 'Café da manhã da Júlia', 'recipe', 'casal'),
('6 receita', 'rc-cafe-mi', 'Casal', 'Café da manhã do Michelangelo', '', '', 'Café da manhã do Michelangelo', 'recipe', 'casal'),
('6 receita', 'rc-cha', 'Casal', 'Chá de camomila com mel', '', '', 'Chá de camomila com mel', 'recipe', 'casal'),
('7 cardápio', 'mp-2026-11-*', 'Júlia + Michelangelo', '112 refeições (4 por dia, cada um)', '', '10/11 a 23/11/2026', '', 'meals', '');
with p as (select id as j, household_id as h from public.profiles where lower(email) = 'juliapontin21@gmail.com')
select c.grupo, c.aba, c.item, c.valor, c.quando,
  case
    when c.tipo = 'rec' and exists (select 1 from public.recurrences x, p where x.household_id = p.h and x.import_key = c.chave) then 'já carregado antes (não duplica)'
    when c.tipo = 'tx' and exists (select 1 from public.transactions x, p where x.household_id = p.h and x.import_key = c.chave) then 'já carregado antes (não duplica)'
    when c.tipo = 'goal' and exists (select 1 from public.goals x, p where x.household_id = p.h and x.import_key = c.chave) then 'já carregado antes (não duplica)'
    when c.tipo = 'recipe' and exists (select 1 from public.recipes x, p where x.household_id = p.h and x.import_key = c.chave) then 'já carregado antes (não duplica)'
    when c.tipo = 'cat' and exists (select 1 from public.categories x, p where x.household_id = p.h and x.module = 'financas' and x.archived_at is null and lower(x.name) = lower(c.parecido)) then 'já existe com esse nome (vou reaproveitar)'
    when c.tipo = 'rec' and exists (select 1 from public.recurrences x, p where x.household_id = p.h and x.archived_at is null and x.context = c.ctx and lower(x.description) like '%' || lower(c.parecido) || '%') then
      'ATENÇÃO: parecido já cadastrado → ' || (select string_agg(x.description || ' ' || to_char(x.amount_cents / 100.0, 'FM999G990D00'), '; ') from public.recurrences x, p where x.household_id = p.h and x.archived_at is null and x.context = c.ctx and lower(x.description) like '%' || lower(c.parecido) || '%')
    when c.tipo = 'tx' and exists (select 1 from public.transactions x, p where x.household_id = p.h and x.archived_at is null and x.context = c.ctx and lower(x.description) like '%' || lower(c.parecido) || '%') then 'ATENÇÃO: parecido já lançado'
    when c.tipo = 'recipe' and exists (select 1 from public.recipes x, p where x.household_id = p.h and x.archived_at is null and lower(x.name) = lower(c.parecido)) then 'ATENÇÃO: receita com esse nome já existe'
    when c.tipo = 'meals' and exists (select 1 from public.meal_plans x, p where x.household_id = p.h and x.import_key like 'mp-2026-11-%') then 'já carregado antes (não duplica)'
    when c.tipo = 'meals' then (select count(*)::text from public.meal_plans x, p where x.household_id = p.h and x.date between '2026-11-10' and '2026-11-23' and x.archived_at is null) || ' refeições que vocês já tinham nesses dias continuam; as do plano entram junto'
    when c.tipo = 'bud' and exists (select 1 from public.budgets x join public.categories k on k.id = x.category_id, p where x.household_id = p.h and x.context = c.ctx and x.archived_at is null and lower(k.name) = lower(c.parecido)) then 'já existe limite nessa categoria (mantenho o atual)'
    else 'novo'
  end as situacao
from cdv_previa c order by c.grupo, c.aba, c.item;
