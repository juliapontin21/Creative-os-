# Etapa 1 · Finanças (Plano de Atualização App Vida, 09/11/2026)

## 1A · Estrutura (`supabase/etapa1.sql`)
- **Valor a confirmar:** lançamentos e contas fixas podem existir sem valor (Munique, Claude, ChatGPT). Ficam com R$ 0, aparecem como "a confirmar" e não entram nos totais. Ao informar o valor, a marcação sai.
- **Chave de importação** (`import_key`): rodar a carga de novo não duplica nada.
- **Caixinhas:** meta total opcional + **aporte por mês** com progresso do mês.
- **Dia-padrão de acerto** em novas contas fixas: Empresa dia 30, PF e Casal dia 5 (fevereiro = último dia do mês).

## 1B · Carga dos dados (`supabase/etapa1-previa.sql` → `supabase/etapa1-dados.sql`)
1. A **prévia** só lê o banco e mostra, item por item: novo, já carregado, ou "parecido já cadastrado".
2. A **gravação** cria categorias (reaproveita as que já existem), contas fixas/recebimentos recorrentes, assinaturas, o acerto da Grazi (2 parcelas), limites do mês, as 4 caixinhas do casal, 10 receitas e o cardápio de 10 a 23/11 para os dois.
3. O app gera os meses das contas fixas ao abrir (as do Michelangelo, quando ele abrir o app).

Conferência automática (no gerador `scripts/gerar-etapa1.py`): Empresa recebe R$ 14.000 em nov/2026 e R$ 11.450 em dez/2026.

Decisões aplicadas:
- Natália e Leide terminam em 30/11/2026. Grazi é "Acertos", não faturamento.
- Pró-labore não é lançado automaticamente (valor variável).
- Fatura do cartão vem das compras no cartão (não é lançada à parte).
- Unhas/cílios, terapia, mercado, lazer e Uber trabalho são **limites** (orçamento), não lançamentos.
- PF e Casal começam em 05/12/2026; novembro já passou do dia 5.
- Receitas sem calorias: preencher depois com rótulo/TACO (nada inventado).

## Pendências (não inventadas)
Valor de Munique, Claude e ChatGPT; valor confirmado do curso Profissão do Futuro; saldo inicial e meta total das caixinhas; pró-labore exato; pagador/rateio dos lançamentos do casal (próxima parte, junto com a planilha anual 1C).
