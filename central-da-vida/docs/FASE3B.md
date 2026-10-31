# Central da Vida · Fase 3B · Gráficos, projeção e simulador

## O que mudou (changelog)

- **Finanças → Gráficos** (em todas as abas):
  - Receitas e despesas do mês com a comparação com o mês anterior.
  - **Receitas × despesas** dos últimos 6 ou 12 meses (pago + previsto), com toque no mês para ver os valores e opção **Ver como tabela**.
  - **Despesas por categoria** do mês (subcategorias somadas na mãe; depois da 7ª, "Outras").
  - **Maiores gastos** do mês.
  - **Saldo projetado** dos próximos 6 meses (saldo de hoje + tudo o que está previsto: contas fixas, parcelas, receitas).
- **Finanças → Simular** (e botão **+ → Simular compra**):
  - Informe o que, valor, quando, para quem (você, Casal ou Empresa), à vista ou no cartão em N parcelas, e a categoria.
  - Resultado: **Cabe**, **Cabe com ajustes** ou **Não cabe / Não recomendado** (Casal), com os números de cada mês afetado: saldo projetado, mesada restante (pessoal) ou sobra do casal, parcelas correndo × referência R2, limite da categoria e dinheiro das caixinhas.
  - **Alternativas**: em quantas parcelas cabe, quanto guardar por mês para comprar à vista, ou adiar.
  - **Premissas editáveis** (renda e caixinhas do mês) e **Lançar esta compra**, que abre o lançamento já preenchido para você confirmar. Nada é lançado sozinho.

## Configuração

Não há mudança no banco. Basta fazer o merge do pull request e, depois de 1 a 2 minutos, fechar e abrir o app.

## Roteiro de teste

| # | Faça | Esperado |
|---|---|---|
| 1 | Finanças → sua aba → **Gráficos** | Barras de receitas e despesas; toque num mês mostra os valores |
| 2 | Ver como tabela | Mesmos números em tabela |
| 3 | Troque para 12 meses | 12 grupos de barras |
| 4 | Confira "Despesas por categoria" | Bate com Lançamentos filtrado pelo mês |
| 5 | Saldo projetado | Meses com contas fixas e parcelas mostram o saldo caindo |
| 6 | **+ → Simular compra**: R$ 3.000 à vista, para você | "Cabe" ou "Cabe com ajustes" conforme a mesada restante, com alternativas |
| 7 | Mesma compra no cartão em 10x | Avalia cada mês e a referência de parcelas (R2) |
| 8 | Compra do Casal maior que a sobra do mês | "Não recomendado: não cabe no orçamento" |
| 9 | Mude a premissa de renda | Resultado recalcula na hora |
| 10 | **Lançar esta compra** | Abre o lançamento preenchido; só salva se você confirmar |

Testes já feitos aqui: 21 testes automáticos (`npm test`), incluindo 5 do simulador (cabe; passa da mesada e sugere 5x; parcelas acima da R2; casal acima da sobra = não recomendado; saldo negativo = não cabe). Telas conferidas em tamanho de iPhone.

## Limitações conhecidas

- O simulador usa os lançamentos e premissas que existem no app; compras fora do app não entram.
- A pergunta em linguagem natural ("posso comprar uma vara de pesca de R$ 3.000?") chega na **Fase 7**, com a IA.
- A projeção considera só o que está lançado ou previsto (contas fixas são geradas para 12 meses).
