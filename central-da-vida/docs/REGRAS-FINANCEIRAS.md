# Central da Vida · Regras financeiras da casa

Definidas pela Júlia em 31/10/2026. O app usa estas regras para calcular, alertar e simular, mas **nunca bloqueia** uma compra real (spec §5).

**Todos os números são referências, não limites.** Cada parâmetro pode ser mudado e cada regra pode ser desligada em Ajustes → Regras da casa. Quando a regra está desligada, o app não mostra alerta nem indicador dela.

## 1. Visibilidade

- Júlia **vê** a organização pessoal do Michelangelo e ele **vê** a dela, mas **nenhum dos dois edita** a área do outro.
- A **Empresa Júlia** é só da Júlia: o Michelangelo não vê.
- O Casal os dois veem e editam.
- O que é pago em cartão mostra **qual cartão** para os dois.
- Os gastos da mesada ficam visíveis para o outro; "sem dar satisfação" significa que **não precisa de acordo** para gastar.

## 2. Como o dinheiro do casal circula (todo mês)

1. **Renda do casal** = renda da Júlia + renda do Michelangelo.
2. Paga-se **todas as contas fixas do casal** (casa, manutenção, lazer do casal etc.).
3. O que sobra vai para as **caixinhas dos desejos** e para a **reserva de emergência**, conforme a meta de cada uma.
4. O restante vira **mesada**, dividida **proporcionalmente à renda** de cada um.
   - Mesada da Júlia = sobra × (renda da Júlia ÷ renda do casal). O mesmo vale para o Michelangelo.
5. A mesada é gasta no dia a dia **sem precisar de acordo** com o outro.
6. **Renda de referência:** Júlia = pró-labore de **R$ 6.000** (fixo). Quando entrar mais dinheiro, ela sinaliza e o cálculo é atualizado. Renda de referência do Michelangelo: a definir na 2B.

## 3. Regras de uso

| # | Regra | Como o app aplica |
|---|---|---|
| R1 | O limite do cartão não pode passar da **renda do casal** | Alerta ao cadastrar ou editar um cartão |
| R2 | Casal: a **soma de todas as parcelas correndo no mês** fica em até **10% da renda do casal**. Individual: a soma das parcelas da pessoa no mês fica em até **10% do salário** dela | Alerta no lançamento parcelado e no simulador (ex.: renda do casal R$ 10.000 → até R$ 1.000/mês em parcelas) |
| R3 | **Um único cartão** paga as despesas do casal; **Pix e débito** pagam as coisas individuais (mesada) | Cartão marcado como "cartão do casal" vira padrão nas despesas do Casal; alerta se uma despesa do Casal usar outro meio ou se o cartão do casal for usado em gasto individual |

## 4. Indicadores de pessoa física (por pessoa, a partir do salário)

| Indicador | Fórmula |
|---|---|
| Patrimônio para viver de renda (salário atual sem trabalhar) | salário × 93 |
| Investimento mínimo por mês para chegar lá | salário × 0,2 |
| Reserva de emergência | salário × 6 |
| Valor para lazer | salário × 0,3 |
| Teto ideal de gastos fixos | salário × 0,5 |

(0,5 fixos + 0,3 lazer + 0,2 investimento = 100% do salário.)

## 5. Indicadores da Empresa Júlia (a partir do faturamento)

| Destino | Fórmula |
|---|---|
| Lucro (não deve ser tocado) | faturamento × 0,10 |
| Teto do pró-labore | faturamento × 0,50 |
| Reserva para impostos | faturamento × 0,18 |
| Custo máximo da operação | faturamento × 0,22 |

(10% + 50% + 18% + 22% = 100% do faturamento.)

## 6. Onde cada regra entra

| Regra | Fase |
|---|---|
| Visibilidade entre vocês, cartão visível, cartão do casal (R3) | 2A |
| Renda do casal, contas fixas, sobra e mesada proporcional | 2B (caixinhas como valor manual até a Fase 3) |
| R1, R2, indicadores PF e da empresa, alertas | 3 |
| Simulador de compras usando todas as regras | 3 |
