# Central da Vida · Fase 2 · Finanças essenciais (proposta)

Documento para aprovação. **Nenhum código é escrito antes do seu "aprovado".**

**Aprovada em 31/10/2026**, em duas entregas (2A e 2B). Respostas registradas em `REGRAS-FINANCEIRAS.md`.

Revisão 2 (31/10/2026): incorpora as regras da casa definidas pela Júlia (ver `REGRAS-FINANCEIRAS.md`).

## 1. Objetivo

Registrar e enxergar o dinheiro dos quatro contextos (Empresa Júlia, Júlia PF, Michelangelo PF e Casal) sem misturar contas e sem contar nada duas vezes. Orçamentos, caixinhas, gráficos e simulador ficam para a Fase 3.

Para caber melhor em cada rodada de teste, proponho dividir em duas entregas, cada uma usável sozinha:

| Entrega | Conteúdo |
|---|---|
| **2A · Base do dinheiro** | Abas, contas, cartões e faturas, lançamentos (receita, despesa, transferência), parcelas, favorecidos/Pix, saldos realizado/previsto/vencido |
| **2B · Mês do casal, empresa e calendário** | Renda do casal, contas fixas, sobra e **mesada proporcional**; pró-labore empresa → Júlia, visão anual da empresa, recorrências, assinaturas, calendário financeiro |

## 2. Quem vê o quê

| Aba | Júlia | Michelangelo |
|---|---|---|
| Empresa Júlia | vê e edita | **não vê** |
| Júlia PF | vê e edita | **só vê** |
| Michelangelo PF | **só vê** | vê e edita |
| Casal | vê e edita | vê e edita |

- Compras no cartão mostram **qual cartão** para os dois.
- Um cartão é marcado como **cartão do casal**: vira o padrão das despesas do Casal (regra R3).
- Na tela da Júlia PF, a empresa aparece só pelo **pró-labore/transferências registradas**. A receita da empresa nunca conta como dinheiro pessoal.

## 3. Telas

Em **Finanças**: seletor de aba no topo (Michelangelo vê só 2 abas) e seletor de mês.

| Tela | O que mostra |
|---|---|
| **Resumo do mês** | Saldo atual das contas, a receber, a pagar, vencidos, previsão de fechamento do mês; próximos vencimentos e recebimentos |
| **Lançamentos** | Lista com a barra de filtros da Fase 1 (categoria, status, tipo, forma de pagamento, conta, cartão, período, busca) |
| **Novo lançamento** | Receita, despesa ou transferência; valor, data de competência, vencimento, conta/cartão, forma de pagamento, favorecido/cliente, categoria, status, link de pagamento, etiquetas (UGC, TikTok…), parcelas; no Casal, o rateio |
| **Contas e cartões** | Contas com saldo inicial; cartões com dia de fechamento e vencimento; fatura de cada mês com total e "marcar fatura como paga" |
| **Favorecidos e Pix** | Nome, chave Pix (botão copiar), observações |
| **Mês do casal** (2B) | Renda do casal (Júlia + Michelangelo) → contas fixas do casal → caixinhas e reserva (valor manual até a Fase 3) → **sobra** → mesada de cada um, proporcional à renda; quanto da mesada cada um já usou |
| **Empresa** (2B) | Visão anual mês a mês (realizado × previsto), contas a receber por cliente, contas a pagar, saldo projetado com saldo inicial configurável |
| **Calendário financeiro** (2B) | Mês com marcações de vencimentos e recebimentos; toque no dia para ver e marcar como pago |
| **Assinaturas** (2B) | Serviço, valor, periodicidade, renovação, link do serviço e **link para o item no gerenciador de senhas** (nunca a senha) |

Botão **+** do app ganha **Despesa** e **Receita**.

## 4. Dados (novas tabelas)

| Tabela | Campos principais |
|---|---|
| `accounts` | contexto, nome, tipo (corrente, poupança, carteira, investimento), saldo inicial e data, cor, arquivada |
| `cards` | contexto, nome, conta que paga a fatura, dia de fechamento, dia de vencimento, limite (opcional) |
| `payees` | contexto, nome, chave Pix, tipo da chave, observações |
| `transactions` | contexto, tipo (receita, despesa, transferência), status (previsto, realizado, cancelado), valor em centavos, competência, vencimento, data de pagamento, conta, cartão, favorecido/cliente, categoria, forma de pagamento, link, etiquetas, parcela n/total, grupo de transferência, recorrência, quem pagou |
| `month_plans` (2B) | mês, renda considerada de cada um, contas fixas, valor destinado a caixinhas/reserva, mesada calculada de cada um |
| `house_rules` | parâmetros das regras da casa (10%, ×93, ×0,2…), editáveis; usados a partir da Fase 3 |
| `recurrences` (2B) | regra (mensal, semanal, anual…), início, fim, e quantos meses gerar à frente |
| `subscriptions` (2B) | serviço, valor, periodicidade, renovação, links |

Regras que garantem os totais:
1. **Vencido** não é gravado: é calculado (previsto + vencimento antes de hoje).
2. **Compra no cartão** é a despesa. Pagar a fatura apenas marca as compras daquela fatura como realizadas, sem lançar outra despesa.
3. **Parcelado** gera uma parcela por fatura, ligadas entre si.
4. **Transferência** (entre contas ou empresa → Júlia) é um par saída/entrada ligado; não aparece como receita nem despesa nos totais.
5. **Despesa do Casal** sai do dinheiro comum, não de cada um: o impacto pessoal aparece na **mesada**, que é calculada depois das contas fixas e das caixinhas. Centavos da divisão da mesada que sobram ficam com quem tem a maior renda no mês.
6. Lançamento com histórico não some: exclusão pede confirmação e fica no histórico; categoria em uso é arquivada.
7. Todas as somas são calculadas a partir dos lançamentos por uma única função testada, nunca digitadas.

## 5. Critérios de aceite

**2A**
- Saldo de cada conta = saldo inicial + realizados; bate com uma conta feita à mão em 3 cenários de teste.
- Compra parcelada em 3x no cartão aparece em 3 faturas; pagar a fatura muda o status das compras e o saldo da conta pagadora uma única vez.
- Previsto, realizado e vencido aparecem separados no resumo do mês.
- Michelangelo não vê nada da Empresa e não consegue editar a Júlia PF (e vice-versa), nem pelo app, nem consultando o banco diretamente.
- Chave Pix copia com um toque.

**2B**
- Exemplo: renda Júlia R$ 6.000 + Michelangelo R$ 4.000 = R$ 10.000; contas fixas R$ 5.000; caixinhas e reserva R$ 2.000 → sobra R$ 3.000 → mesada Júlia R$ 1.800 e Michelangelo R$ 1.200.
- Uma despesa do Casal conta uma vez só no total, mesmo aparecendo para os dois.
- Pró-labore de R$ 3.000 reduz a empresa e aumenta a Júlia PF; o total geral não muda.
- Visão anual da empresa mostra 12 meses com realizado e previsto.
- Recorrência mensal gera os próximos 12 meses; editar "só esta" não muda as outras.

## 6. Complexidade e custo

- **Complexidade:** alta. É a fase com mais regras de cálculo; por isso a divisão 2A/2B.
- **Custo de serviços:** nenhum. Continua nos planos gratuitos (Supabase e Vercel). Sem IA nesta fase.
- **Fora desta fase:** orçamentos e limites, caixinhas, gráficos, projeções e simulador (Fase 3); lembretes no celular (Fase 4); importar extrato bancário (não previsto; pode ser avaliado depois).

## 7. Perguntas

1. **Visibilidade:** quando um vê a organização do outro, pode também **editar** ou só **ver**? E a **Empresa Júlia**, o Michelangelo vê?
2. **Gastos da mesada:** como a mesada é "sem dar satisfação", o outro deve ver **cada gasto** da mesada ou só **quanto já foi usado** do total?
3. **Regra do parcelamento (R2), num exemplo com renda do casal de R$ 10.000:** o limite de 10% (R$ 1.000) vale para
   a) o **valor de cada parcela** (até R$ 1.000 por mês);
   b) o **preço total** da compra (até R$ 1.000 no total); ou
   c) a **soma de todas as parcelas que já estão rodando** no mês (até R$ 1.000 por mês somando todas)?
4. **Renda que varia (UGC, freelas):** a mesada usa a renda **do próprio mês** ou a **média dos últimos 3 meses**?
5. **Aprova a divisão em 2A e 2B?**
