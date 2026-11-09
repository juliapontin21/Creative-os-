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
- PF e Casal começam em 05/11/2026 (ciclo do mês começa em 30/10). As contas de novembro já pagas em 09/11 entram pelo `etapa1-novembro.sql`.
- Receitas sem calorias: preencher depois com rótulo/TACO (nada inventado).

## Pendências (não inventadas)
Valor de Munique, Claude e ChatGPT; valor confirmado do curso Profissão do Futuro; saldo inicial e meta total das caixinhas; pró-labore exato; pagador/rateio dos lançamentos do casal (próxima parte, junto com a planilha anual 1C).

## Saldo em conta corrente (antes "mesada")
- Regra: juntar as rendas, pagar as contas, separar as caixinhas e dividir o que sobra na proporção da renda = **saldo em conta corrente** de cada um.
- Em mês fora do normal, ajuste em Finanças → Casal → Mês do casal → Ajustar este mês: renda e saldo de cada um só naquele mês.
- `supabase/etapa1-saldos-novembro.sql`: novembro/2026 com Júlia sem renda (saldo R$ 0), Michelangelo R$ 8.000 (saldo R$ 300), caixinhas R$ 4.373,85 (Viagem 1.000 · Carro 1.984,62 · Emergência 992,31 · Imprevistos 396,92) e limites só de novembro: Lazer R$ 174, Uber trabalho R$ 200.

## Renda e caixinhas reais do mês (ajuste de 09/11)
- **Renda do casal = o que foi lançado.** Lance a renda de cada um como receita na aba Casal e escolha "Renda de quem". Sem lançamento, vale o ajuste do mês; sem ajuste, a renda de referência (Júlia R$ 6.000; Michelangelo variável, lançar todo mês).
- **Guardado nas caixinhas = aportes feitos no mês** (não a meta). A meta mensal aparece só como referência, não obrigatória.
- **Ocultar no mês:** qualquer indicador (ex.: Parcelas do casal) tem um X para ocultar só naquele mês.
- **Metas da Júlia (PF):** página limpa com o botão "Criar meta". **Empresa:** só a meta de impostos.
- `supabase/etapa1-ajuste-novembro.sql`: Renda Júlia R$ 674 + Michelangelo R$ 8.000; caixinhas Carro 3.000, Viagem 1.000, Emergência 172, Imprevistos 0; limites de novembro Uber 200 e Lazer 374; saldo Júlia 0 e Michelangelo 300. Substitui a divisão do `etapa1-saldos-novembro.sql`.
