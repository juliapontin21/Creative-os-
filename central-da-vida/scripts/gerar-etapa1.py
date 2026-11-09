# Gera supabase/etapa1-previa.sql e supabase/etapa1-dados.sql a partir do Plano de Atualização (09/11/2026).
import json, sys
OUT = sys.argv[1] if len(sys.argv) > 1 else "supabase"  # rode da pasta central-da-vida: python3 scripts/gerar-etapa1.py
q = lambda s: "'" + str(s).replace("'", "''") + "'"
def cents(v): return int(round(v * 100))

# ── Categorias (chave, dono J/M/casal, pai, nome, cor, tipo) ──
CATS = [
 ('emp_rec', 'J', None, 'Empresa · Receitas', '#15803d', None),
 ('marketing', 'J', 'emp_rec', 'Marketing', '#16a34a', None),
 ('redes', 'J', 'emp_rec', 'Gestão de redes sociais', '#059669', None),
 ('acertos', 'J', 'emp_rec', 'Acertos / valores a receber', '#0d9488', None),
 ('emp_desp', 'J', None, 'Empresa · Despesas', '#b91c1c', None),
 ('contab', 'J', 'emp_desp', 'Contabilidade', '#dc2626', 'fixo'),
 ('impostos', 'J', 'emp_desp', 'Impostos', '#991b1b', 'imposto'),
 ('ferramentas', 'J', 'emp_desp', 'Ferramentas e sistemas', '#ea580c', 'fixo'),
 ('cursos', 'J', 'emp_desp', 'Cursos e capacitação', '#d97706', None),
 ('prestadores', 'J', 'emp_desp', 'Prestadores', '#c2410c', None),
 ('equip', 'J', 'emp_desp', 'Equipamentos / telefonia', '#9a3412', 'fixo'),
 ('munique', 'J', 'emp_desp', 'Pagamento Munique', '#7c2d12', None),
 ('j_rec', 'J', None, 'Recebimentos', '#15803d', None),
 ('prolabore', 'J', 'j_rec', 'Pró-labore', '#16a34a', None),
 ('ressarc', 'J', 'j_rec', 'Ressarcimentos', '#0d9488', None),
 ('aluguel_vaga', 'J', 'j_rec', 'Renda de aluguel', '#059669', None),
 ('j_fixos', 'J', None, 'Custos fixos', '#7c3aed', 'fixo'),
 ('consorcio', 'J', 'j_fixos', 'Consórcio', '#6d28d9', 'fixo'),
 ('beleza', 'J', None, 'Beleza', '#db2777', None),
 ('saude', 'J', None, 'Saúde', '#0891b2', None),
 ('terapia', 'J', 'saude', 'Terapia', '#0e7490', None),
 ('m_fixos', 'M', None, 'Custos fixos', '#2563eb', 'fixo'),
 ('m_internet', 'M', 'm_fixos', 'Plano de internet celular', '#1d4ed8', 'fixo'),
 ('m_celular', 'M', 'm_fixos', 'Parcela do celular (Júlia)', '#1e40af', 'fixo'),
 ('casa_fixos', 'casal', None, 'Casa · Fixos', '#7c3aed', 'fixo'),
 ('aluguel', 'casal', 'casa_fixos', 'Aluguel', '#6d28d9', 'fixo'),
 ('agua', 'casal', 'casa_fixos', 'Água', '#0284c7', 'fixo'),
 ('luz', 'casal', 'casa_fixos', 'Luz', '#ca8a04', 'fixo'),
 ('gas', 'casal', 'casa_fixos', 'Gás', '#ea580c', 'fixo'),
 ('internet_tv', 'casal', 'casa_fixos', 'Internet e TV', '#4f46e5', 'fixo'),
 ('mercado', 'casal', 'casa_fixos', 'Alimentação / mercado', '#16a34a', 'fixo'),
 ('ingles', 'casal', 'casa_fixos', 'Curso de inglês', '#9333ea', 'fixo'),
 ('lazer', 'casal', None, 'Lazer', '#db2777', 'lazer'),
 ('ifood', 'casal', 'lazer', 'iFood e delivery', '#e11d48', 'lazer'),
 ('passeios', 'casal', 'lazer', 'Passeios e saídas', '#be185d', 'lazer'),
 ('uber_lazer', 'casal', 'lazer', 'Uber lazer', '#831843', 'lazer'),
 ('transporte', 'casal', None, 'Transporte', '#475569', None),
 ('uber_trab', 'casal', 'transporte', 'Uber trabalho', '#334155', None),
]
CATNAME = {c[0]: c[3] for c in CATS}

# ── Contas fixas / recebimentos recorrentes (chave, dono, aba, tipo, descrição, valor|None, início, fim, categoria, cliente, assinatura, palavra p/ achar parecido) ──
E, J1, C1 = '2026-11-30', '2026-11-05', '2026-11-05'  # PF e Casal: ciclo começa em novembro (pedido em 09/11)
REC = [
 ('emp-rec-qls', 'J', 'empresa', 'receita', 'Academia dos Resíduos (QLS)', 1750, '2026-11-05', None, 'marketing', 'Academia dos Resíduos (QLS)', False, 'resíduos'),
 ('emp-rec-vacaro', 'J', 'empresa', 'receita', 'Vacaro Odontologia', 2300, E, None, 'redes', 'Vacaro Odontologia', False, 'vacaro'),
 ('emp-rec-natalia', 'J', 'empresa', 'receita', 'Dra. Natália Vieira', 1650, E, '2026-11-30', 'redes', 'Dra. Natália Vieira', False, 'natália'),
 ('emp-rec-altair', 'J', 'empresa', 'receita', 'Altair', 2700, E, None, 'redes', 'Altair', False, 'altair'),
 ('emp-rec-donapreguica', 'J', 'empresa', 'receita', 'Dona Preguiça', 1000, E, None, 'redes', 'Dona Preguiça', False, 'preguiça'),
 ('emp-rec-leide', 'J', 'empresa', 'receita', 'Leide', 900, E, '2026-11-30', 'redes', 'Leide', False, 'leide'),
 ('emp-rec-jaqueline', 'J', 'empresa', 'receita', 'Jaqueline (consórcio)', 1000, E, None, 'redes', 'Jaqueline', False, 'jaqueline'),
 ('emp-rec-bruno', 'J', 'empresa', 'receita', 'Bruno Ferreira', 1000, E, None, 'redes', 'Bruno Ferreira', False, 'bruno'),
 ('emp-desp-contab', 'J', 'empresa', 'despesa', 'Contabilidade', 200, E, None, 'contab', '', False, 'contab'),
 ('emp-desp-mei', 'J', 'empresa', 'despesa', 'Guia MEI', 80, E, None, 'impostos', '', False, 'mei'),
 ('emp-desp-plataforma', 'J', 'empresa', 'despesa', 'Plataforma de gestão de redes sociais', 129, E, None, 'ferramentas', '', True, 'plataforma'),
 ('emp-desp-david', 'J', 'empresa', 'despesa', 'David — gestão de tráfego', 500, E, None, 'prestadores', 'David', False, 'david'),
 ('emp-desp-celular', 'J', 'empresa', 'despesa', 'Parcela celular Júlia', 550, E, None, 'equip', '', False, 'celular'),
 ('emp-desp-munique', 'J', 'empresa', 'despesa', 'Pagamento Munique', None, E, None, 'munique', 'Munique', False, 'munique'),
 ('emp-sub-claude', 'J', 'empresa', 'despesa', 'Claude (plano pago)', None, E, None, 'ferramentas', '', True, 'claude'),
 ('emp-sub-chatgpt', 'J', 'empresa', 'despesa', 'ChatGPT (plano pago)', None, E, None, 'ferramentas', '', True, 'chatgpt'),
 ('emp-sub-profissao', 'J', 'empresa', 'despesa', 'Profissão do Futuro — Rafaela Chagas', 59.90, E, None, 'cursos', 'Rafaela Chagas', True, 'profissão'),
 ('emp-sub-drive', 'J', 'empresa', 'despesa', 'Google Drive — armazenamento adicional', 49.90, E, None, 'ferramentas', '', True, 'drive'),
 ('jpf-rec-ressarc', 'J', 'pf', 'receita', 'Michelangelo — parcela do celular', 300, J1, None, 'ressarc', 'Michelangelo', False, 'celular'),
 ('jpf-rec-vaga', 'J', 'pf', 'receita', 'Aluguel da vaga', 150, J1, None, 'aluguel_vaga', '', False, 'vaga'),
 ('jpf-desp-consorcio', 'J', 'pf', 'despesa', 'Consórcio', 1380, J1, None, 'consorcio', '', False, 'consórcio'),
 ('mpf-desp-internet', 'M', 'pf', 'despesa', 'Plano de internet celular', 60, J1, None, 'm_internet', '', False, 'internet'),
 ('mpf-desp-celular', 'M', 'pf', 'despesa', 'Parcela do celular (paga à Júlia)', 300, J1, None, 'm_celular', 'Júlia', False, 'celular'),
 ('casal-aluguel', 'J', 'casal', 'despesa', 'Aluguel', 2202.33, C1, None, 'aluguel', '', False, 'aluguel'),
 ('casal-agua', 'J', 'casal', 'despesa', 'Água', 30, C1, None, 'agua', '', False, 'água'),
 ('casal-luz', 'J', 'casal', 'despesa', 'Luz', 170, C1, None, 'luz', '', False, 'luz'),
 ('casal-gas', 'J', 'casal', 'despesa', 'Gás', 30, C1, None, 'gas', '', False, 'gás'),
 ('casal-internet', 'J', 'casal', 'despesa', 'Internet e TV', 270, C1, None, 'internet_tv', '', False, 'internet'),
 ('casal-ingles', 'J', 'casal', 'despesa', 'Curso de inglês', 140, C1, None, 'ingles', '', True, 'inglês'),
]
# Lançamentos avulsos (Grazi, 2 parcelas)
TX = [
 ('emp-grazi-1', 'J', 'empresa', 'receita', 'Grazi — acerto de dívida', 1700, '2026-11-30', 'acertos', 'Grazi', 1, 2, 'grazi'),
 ('emp-grazi-2', 'J', 'empresa', 'receita', 'Grazi — acerto de dívida', 1700, '2026-12-30', 'acertos', 'Grazi', 2, 2, 'grazi'),
]
# Limites (orçamento mensal), não são lançamentos
BUD = [
 ('J', 'pf', 'beleza', 300, 'Unhas e cílios'), ('J', 'pf', 'terapia', 500, 'Terapia (referência)'),
 ('J', 'casal', 'mercado', 1000, 'Alimentação / mercado'), ('J', 'casal', 'lazer', 1000, 'Lazer (iFood, passeios, Uber lazer)'),
 ('J', 'casal', 'uber_trab', 200, 'Uber trabalho'),
]
GOALS = [
 ('casal-cx-carro', 'Comprar o carro', 'desejo', 1000, '#2563eb'), ('casal-cx-emergencia', 'Reserva de emergência', 'reserva', 500, '#059669'),
 ('casal-cx-viagens', 'Reserva para viagens', 'desejo', 500, '#db2777'), ('casal-cx-imprevistos', 'Imprevistos (presentes, reparos, inesperados)', 'reserva', 200, '#d97706'),
]

# ── Cardápio 10–23/11 ──
def ing(*xs): return [{'name': n, 'qty': qq, 'unit': u} for (n, qq, u) in xs]
POR = 'Porções iniciais (ajustáveis, não são prescrição): '
RECIPES = [
 ('rc-frango-arroz-legumes', 'Frango, arroz e legumes', 2, ing(('Frango', None, ''), ('Arroz', None, ''), ('Cenoura', None, ''), ('Abobrinha', None, ''), ('Brócolis', None, ''), ('Cebola', None, ''), ('Alho', None, ''), ('Temperos', None, '')),
  POR + 'Júlia: proteína cozida 120–150 g, arroz cozido 100–130 g, legumes 150–250 g. Michelangelo: proteína 170–220 g, arroz 160–220 g, legumes 200–300 g.\nMarmita: congelar porções prontas; salada fresca à parte, adicionada na hora.'),
 ('rc-carne-arroz-abobrinha', 'Carne moída, arroz e abobrinha', 2, ing(('Patinho / carne moída magra', None, ''), ('Arroz', None, ''), ('Abobrinha', None, ''), ('Cebola', None, ''), ('Alho', None, ''), ('Molho de tomate', None, ''), ('Temperos', None, '')),
  POR + 'Júlia: proteína cozida 120–150 g, arroz cozido 100–130 g, legumes 150–250 g. Michelangelo: proteína 170–220 g, arroz 160–220 g, legumes 200–300 g.\nMarmita: congelar porções prontas; salada fresca à parte.'),
 ('rc-macarrao-frango', 'Macarrão com frango e molho', 2, ing(('Macarrão', None, ''), ('Frango', None, ''), ('Molho de tomate', None, ''), ('Cebola', None, ''), ('Alho', None, ''), ('Temperos', None, '')),
  POR + 'Júlia: macarrão cozido 120–160 g, proteína 120–150 g. Michelangelo: macarrão cozido 180–240 g, proteína 170–220 g.\nMarmita: congelar porções prontas; salada fresca à parte.'),
 ('rc-hamburguer', 'Hambúrguer caseiro', 2, ing(('Patinho moído', None, ''), ('Pão de hambúrguer', None, ''), ('Alface', None, ''), ('Tomate', None, ''), ('Muçarela', None, ''), ('Temperos', None, '')),
  POR + 'Patinho cru: Júlia 120 g; Michelangelo 170–200 g.'),
 ('rc-pizza-atum', 'Pizza de atum', 1, ing(('Base individual de pizza', 1, 'un'), ('Atum', None, ''), ('Molho de tomate', None, ''), ('Muçarela', None, ''), ('Cebola', None, '')),
  POR + 'Atum drenado: 70–90 g (Júlia).'),
 ('rc-caesar-frango', 'Caesar com frango', 1, ing(('Alface', None, ''), ('Frango', None, ''), ('Muçarela', None, ''), ('Limão', None, ''), ('Azeite', None, '')),
  POR + 'Proteína do Michelangelo: 170–220 g.'),
 ('rc-arroz-frango', 'Arroz com frango', 1, ing(('Arroz', None, ''), ('Frango', None, ''), ('Cenoura', None, ''), ('Cebola', None, ''), ('Alho', None, ''), ('Temperos', None, '')),
  POR + 'Michelangelo: proteína 170–220 g, arroz 160–220 g.'),
 ('rc-cafe-julia', 'Café da manhã da Júlia', 1, ing(('Iogurte', 1, 'un'), ('Uvas', None, ''), ('Chia', 5, 'g'), ('Linhaça', 5, 'g'), ('Cappuccino', 1, 'porção')),
  'Opcional conforme fome e meta: 1 ovo ou 1 fatia de pão na chapa. Conferir o rótulo do iogurte.'),
 ('rc-cafe-mi', 'Café da manhã do Michelangelo', 1, ing(('Ovos', None, ''), ('Pão', None, ''), ('Fruta', None, '')),
  'Alternativa quando for prático: iogurte proteico + aveia.'),
 ('rc-cha', 'Chá de camomila com mel', 1, ing(('Chá de camomila', 1, 'sachê'), ('Mel', 1, 'colher de chá')),
  'Opcional, antes de dormir.'),
]
LUNCH = {'F': 'rc-frango-arroz-legumes', 'C': 'rc-carne-arroz-abobrinha', 'M': 'rc-macarrao-frango'}
DIN = {'H': 'rc-hamburguer', 'P': 'rc-pizza-atum', 'S': 'rc-caesar-frango', 'A': 'rc-arroz-frango'}
DAYS = [(10,'F','Iogurte proteico + banana','H','H'),(11,'F','Whey ou iogurte + fruta','P','S'),(12,'C','Iogurte proteico + fruta','H','A'),(13,'C','Whey + banana','P','S'),
 (14,'M','Iogurte proteico + fruta','H','H'),(15,'M','Whey ou iogurte + fruta','P','A'),(16,'F','Iogurte proteico + banana','H','S'),(17,'F','Whey ou iogurte + fruta','H','H'),
 (18,'C','Iogurte proteico + fruta','P','S'),(19,'C','Whey + banana','H','A'),(20,'M','Iogurte proteico + fruta','P','S'),(21,'M','Whey ou iogurte + fruta','H','H'),
 (22,'F','Iogurte proteico + banana','P','A'),(23,'F','Whey ou iogurte + fruta','H','S')]
MEALS = []  # (chave, dono, data, refeição, receita|None, texto)
for d, l, lanche, jj, mm in DAYS:
  dt = f'2026-11-{d:02d}'
  for who, cafe, din in (('J', 'rc-cafe-julia', DIN[jj]), ('M', 'rc-cafe-mi', DIN[mm])):
    MEALS += [(f'mp-{dt}-{who}-cafe', who, dt, 'cafe', cafe, ''), (f'mp-{dt}-{who}-almoco', who, dt, 'almoco', LUNCH[l], ''),
              (f'mp-{dt}-{who}-lanche', who, dt, 'lanche', None, lanche), (f'mp-{dt}-{who}-jantar', who, dt, 'jantar', din, '')]

# ── Conferência dos totais (mesma regra de datas do app: dia limitado ao fim do mês) ──
import calendar
def add_months(iso, n):
  y, m, d = map(int, iso.split('-')); t = (y * 12 + m - 1) + n; y2, m2 = divmod(t, 12); m2 += 1
  return f'{y2}-{m2:02d}-{min(d, calendar.monthrange(y2, m2)[1]):02d}'
def month_total(ctx, kind, ym, owner=None):
  s = 0
  for r in REC:
    if r[2] != ctx or r[3] != kind or (owner and r[1] != owner) or r[5] is None: continue
    for i in range(24):
      dd = add_months(r[6], i)
      if r[7] and dd > r[7]: break
      if dd[:7] == ym: s += cents(r[5])
  for t in TX:
    if t[2] == ctx and t[3] == kind and t[6][:7] == ym: s += cents(t[5])
  return s
nov, dez = month_total('empresa', 'receita', '2026-11'), month_total('empresa', 'receita', '2026-12')
assert nov == 1400000, nov
assert dez == 1145000, dez
assert month_total('empresa', 'despesa', '2026-12') == cents(200 + 80 + 129 + 500 + 550 + 59.90 + 49.90)
assert month_total('casal', 'despesa', '2026-12') == cents(2202.33 + 30 + 170 + 30 + 270 + 140)
assert add_months('2026-11-30', 3) == '2027-02-28'
print('totais ok: empresa nov', nov / 100, 'dez', dez / 100, file=sys.stderr)

HEAD = """-- Gerado a partir do Plano de Atualização App Vida (09/11/2026). Não cole chaves secretas aqui.
-- Datas: Empresa paga/recebe dia 30 (fevereiro = último dia); Júlia PF, Michelangelo PF e Casal dia 5.
-- Valores sem informação ficam como "a confirmar" (R$ 0, fora dos totais).
"""
who = lambda w: {'J': 'J', 'M': 'M', 'casal': 'J'}[w]
money = lambda v: 'a confirmar' if v is None else f'R$ {v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
ABA = {'empresa': 'Empresa', 'pf': 'PF', 'casal': 'Casal'}

# ───── Prévia (só leitura) ─────
rows = []
for k, o, p, n, col, b in CATS:
  rows.append(('1 categoria', k, 'Casal' if o == 'casal' else ('Júlia' if o == 'J' else 'Michelangelo'), (CATNAME[p] + ' › ' if p else '') + n, '', '', n, 'cat', o))
for r in REC:
  dono = 'Michelangelo' if r[1] == 'M' else 'Júlia'
  quando = f"todo mês, a partir de {r[6][8:]}/{r[6][5:7]}" + (f" até {r[7][8:]}/{r[7][5:7]}/{r[7][:4]}" if r[7] else '') 
  rows.append(('2 conta fixa' if not r[10] else '2 assinatura', r[0], f"{ABA[r[2]]} · {dono}", f"{'↓' if r[3]=='receita' else '↑'} {r[4]}", money(r[5]), quando, r[11], 'rec', r[2]))
for t in TX:
  rows.append(('3 lançamento', t[0], 'Empresa · Júlia', f"↓ {t[4]} ({t[9]}/{t[10]})", money(t[5]), f"{t[6][8:]}/{t[6][5:7]}/{t[6][:4]}", t[11], 'tx', t[2]))
for o, ctx, c, v, label in BUD:
  rows.append(('4 limite do mês', f'bud-{ctx}-{c}', ABA[ctx], label, money(v), 'por mês', CATNAME[c], 'bud', ctx))
for g in GOALS:
  rows.append(('5 caixinha', g[0], 'Casal', g[1], money(g[3]), 'aporte por mês · saldo inicial R$ 0', g[1], 'goal', 'casal'))
for r in RECIPES:
  rows.append(('6 receita', r[0], 'Casal', r[1], '', '', r[1], 'recipe', 'casal'))
rows.append(('7 cardápio', 'mp-2026-11-*', 'Júlia + Michelangelo', f'{len(MEALS)} refeições (4 por dia, cada um)', '', '10/11 a 23/11/2026', '', 'meals', ''))

def row_sql(r):
  return '(' + ', '.join(q(x) for x in r) + ')'
prev = HEAD + """-- PRÉVIA: só lê o banco, não grava nada. Rode, confira a coluna "situacao" e me mande o resultado (ou um print).
create temp table cdv_previa (grupo text, chave text, aba text, item text, valor text, quando text, parecido text, tipo text, ctx text);
insert into cdv_previa values
""" + ',\n'.join(row_sql(r) for r in rows) + """;
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
"""
open(f'{OUT}/etapa1-previa.sql', 'w').write(prev)

# ───── Gravação ─────
L = [HEAD + """-- GRAVAÇÃO: rode só depois de conferir a prévia. Pode rodar de novo: o que já foi carregado não duplica.
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
""" + '\n'.join(f'  c_{c[0]} uuid;' for c in CATS) + '\n' + '\n'.join(f'  r_{r[0]} uuid;' for r in RECIPES).replace('-', '_') + """
begin
  select id, household_id into J, H from public.profiles where lower(email) = 'juliapontin21@gmail.com';
  if J is null then raise exception 'Perfil da Júlia não encontrado.'; end if;
  select id into M from public.profiles where household_id = H and id <> J limit 1;
  if M is null then raise notice 'O Michelangelo ainda não entrou no app: a parte dele fica para depois (rode de novo quando ele entrar; nada duplica).'; end if;

  -- Categorias (reaproveita as que já existem com o mesmo nome)"""]
for k, o, p, n, col, b in CATS:
  sc = 'casal' if o == 'casal' else 'pessoal'
  line = f"c_{k} := pg_temp.cdv_cat(H, {who(o)}, {q(sc)}, {'c_' + p if p else 'null'}, {q(n)}, {q(col)}, {q(b) if b else 'null'});"
  L.append(f"  if M is not null then {line} end if;" if o == 'M' else f"  {line}")
L.append('\n  -- Contas fixas, recebimentos recorrentes e assinaturas (o app gera os meses ao abrir)')
for r in REC:
  k, o, ctx, kind, desc, v, st, en, cat, client, sub, _ = r
  L.append(("  if M is not null then\n" if o == 'M' else '') + f"  insert into public.recurrences (household_id, owner_id, context, kind, description, amount_cents, amount_pending, frequency, start_date, end_date, category_id, client, payment_method, is_subscription, import_key)\n"
           f"    values (H, {who(o)}, {q(ctx)}, {q(kind)}, {q(desc)}, {0 if v is None else cents(v)}, {'true' if v is None else 'false'}, 'mensal', {q(st)}, {q(en) if en else 'null'}, c_{cat}, {q(client)}, 'outro', {'true' if sub else 'false'}, {q(k)}) on conflict do nothing;" + ("\n  end if;" if o == 'M' else ''))
L.append('\n  -- Grazi: acerto de dívida em 2 parcelas (não é faturamento de serviço)')
for t in TX:
  k, o, ctx, kind, desc, v, d, cat, client, n, tot, _ = t
  L.append(f"  insert into public.transactions (household_id, owner_id, context, kind, status, amount_cents, description, competence_date, due_date, category_id, client, payment_method, installment_group, installment_no, installment_total, import_key)\n"
           f"    values (H, {who(o)}, {q(ctx)}, {q(kind)}, 'previsto', {cents(v)}, {q(desc)}, {q(d)}, {q(d)}, c_{cat}, {q(client)}, 'outro', md5('cdv-grazi')::uuid, {n}, {tot}, {q(k)}) on conflict do nothing;")
L.append('\n  -- Limites por mês (orçamento, não é lançamento)')
for o, ctx, c, v, _ in BUD:
  L.append(f"  insert into public.budgets (household_id, owner_id, context, category_id, limit_cents) values (H, {who(o)}, {q(ctx)}, c_{c}, {cents(v)}) on conflict do nothing;")
L.append('\n  -- Caixinhas do casal: aporte mensal; meta total e saldo inicial a definir')
for k, n, kind, v, col in GOALS:
  L.append(f"  insert into public.goals (household_id, owner_id, context, name, kind, target_cents, monthly_cents, color, import_key) values (H, J, 'casal', {q(n)}, {q(kind)}, 0, {cents(v)}, {q(col)}, {q(k)}) on conflict do nothing;")
L.append('\n  -- Receitas do cardápio (sem calorias inventadas: preencha depois com rótulo/TACO)')
for k, n, sv, ings, steps in RECIPES:
  var = 'r_' + k.replace('-', '_')
  L.append(f"  insert into public.recipes (household_id, owner_id, context, name, servings, ingredients, steps, import_key) values (H, J, 'casal', {q(n)}, {sv}, {q(json.dumps(ings, ensure_ascii=False))}::jsonb, {q(steps)}, {q(k)}) on conflict do nothing;")
  L.append(f"  select id into {var} from public.recipes where household_id = H and import_key = {q(k)};")
L.append('\n  -- Cardápio 10–23/11/2026 (Júlia e Michelangelo)')
for k, o, d, meal, rc, txt in MEALS:
  rv = 'r_' + rc.replace('-', '_') if rc else 'null'
  st = f"insert into public.meal_plans (household_id, owner_id, context, date, meal, recipe_id, text, import_key) values (H, {o}, 'pf', {q(d)}, {q(meal)}, {rv}, {q(txt)}, {q(k)}) on conflict do nothing;"
  L.append(f"  if M is not null then {st} end if;" if o == 'M' else f"  {st}")
L.append("end $$;\n\nselect case when exists (select 1 from public.profiles p, public.profiles j where lower(j.email) = 'juliapontin21@gmail.com' and p.household_id = j.household_id and p.id <> j.id)\n  then 'Pronto! Tudo gravado. Abra o app: contas fixas em Finanças e cardápio em Alimentação.'\n  else 'Pronto! Sua parte, Casal e Empresa gravados. Quando o Michelangelo entrar no app, rode este mesmo arquivo de novo para completar a parte dele (nada duplica).' end as resultado;\n")
open(f'{OUT}/etapa1-dados.sql', 'w').write('\n'.join(L))
