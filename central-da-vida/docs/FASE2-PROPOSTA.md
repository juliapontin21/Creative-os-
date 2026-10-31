# Central da Vida · Fase 2 · Finanças essenciais (proposta)

Documento para aprovação. **Nenhum código é escrito antes do seu "aprovado".**

## 1. Objetivo

Registrar e enxergar o dinheiro dos quatro contextos (Empresa Júlia, Júlia PF, Michelangelo PF e Casal) sem misturar contas e sem contar nada duas vezes. Orçamentos, caixinhas, gráficos e simulador ficam para a Fase 3.

Para caber melhor em cada rodada de teste, proponho dividir em duas entregas, cada uma usável sozinha:

| Entrega | Conteúdo |
|---|---|
| **2A · Base do dinheiro** | Abas, contas, cartões e faturas, lançamentos (receita, despesa, transferência), parcelas, favorecidos/Pix, saldos realizado/previsto/vencido |
| **2B · Casal, empresa e calendário** | Rateio do casal e acerto entre vocês, pró-labore empresa → Júlia, visão anual da empresa, recorrências, assinaturas, calendário financeiro |

## 2. Quem vê o quê

| Aba | Júlia | Michelangelo |
|---|---|---|
| Empresa Júlia | vê e edita | **não vê** |
| Júlia PF | vê e edita | **não vê** |
| Michelangelo PF | **não vê** | vê e edita |
| Casal | vê e edita | vê e edita |

- Uma despesa do Casal paga com o cartão pessoal da Júlia aparece para o Michelangelo como **"pago por Júlia"**, sem mostrar qual conta ou cartão foi usado.
- Na tela pessoal, cada um vê **"minha parte do Casal"**, calculada pelo rateio, sem cópia do lançamento.
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
| **Casal** (2B) | Despesas e receitas do casal, parte de cada um, **acerto** ("Michelangelo deve R$ X para Júlia") e "registrar acerto" |
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
| `splits` | lançamento do Casal → parte de cada pessoa (em centavos) e regra (50/50, proporção, valor) |
| `recurrences` (2B) | regra (mensal, semanal, anual…), início, fim, e quantos meses gerar à frente |
| `subscriptions` (2B) | serviço, valor, periodicidade, renovação, links |

Regras que garantem os totais:
1. **Vencido** não é gravado: é calculado (previsto + vencimento antes de hoje).
2. **Compra no cartão** é a despesa. Pagar a fatura apenas marca as compras daquela fatura como realizadas, sem lançar outra despesa.
3. **Parcelado** gera uma parcela por fatura, ligadas entre si.
4. **Transferência** (entre contas ou empresa → Júlia) é um par saída/entrada ligado; não aparece como receita nem despesa nos totais.
5. **Rateio** sempre soma exatamente o valor da despesa; centavos que sobram vão para quem pagou.
6. Lançamento com histórico não some: exclusão pede confirmação e fica no histórico; categoria em uso é arquivada.
7. Todas as somas são feitas pelo banco a partir dos lançamentos, nunca digitadas.

## 5. Critérios de aceite

**2A**
- Saldo de cada conta = saldo inicial + realizados; bate com uma conta feita à mão em 3 cenários de teste.
- Compra parcelada em 3x no cartão aparece em 3 faturas; pagar a fatura muda o status das compras e o saldo da conta pagadora uma única vez.
- Previsto, realizado e vencido aparecem separados no resumo do mês.
- Michelangelo não vê nada da Empresa nem da Júlia PF, nem pelo app, nem consultando o banco diretamente.
- Chave Pix copia com um toque.

**2B**
- Despesa do Casal de R$ 100 em 50/50 mostra R$ 50 na tela de cada um e R$ 100 no total do Casal (não R$ 200).
- Acerto do casal fecha em zero depois de "registrar acerto".
- Pró-labore de R$ 3.000 reduz a empresa e aumenta a Júlia PF; o total geral não muda.
- Visão anual da empresa mostra 12 meses com realizado e previsto.
- Recorrência mensal gera os próximos 12 meses; editar "só esta" não muda as outras.

## 6. Complexidade e custo

- **Complexidade:** alta. É a fase com mais regras de cálculo; por isso a divisão 2A/2B.
- **Custo de serviços:** nenhum. Continua nos planos gratuitos (Supabase e Vercel). Sem IA nesta fase.
- **Fora desta fase:** orçamentos e limites, caixinhas, gráficos, projeções e simulador (Fase 3); lembretes no celular (Fase 4); importar extrato bancário (não previsto; pode ser avaliado depois).

## 7. Perguntas

1. **Como vocês pagam as despesas do casal hoje?**
   a) Conta conjunta; b) cada um paga algumas e depois acertam; c) uma pessoa paga tudo e a outra transfere a parte dela.
2. **Rateio padrão do casal:** 50/50, ou proporcional à renda de cada um? Dá para mudar item a item depois.
3. **Aprova a divisão em 2A e 2B?**
