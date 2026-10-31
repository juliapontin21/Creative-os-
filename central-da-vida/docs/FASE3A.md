# Central da Vida · Fase 3A · Metas, limites e alertas

## O que mudou (changelog)

- **Regras da casa** (Ajustes → Regras da casa): todos os números são **referências editáveis** e cada regra tem liga/desliga. Casal (R1, R2 do casal, R3) os dois editam; as pessoais, cada um as suas; as da empresa, só a Júlia. "Voltar ao padrão" restaura os números originais.
- **Finanças → Metas** (em todas as abas):
  - **Alertas do mês**: R1 (limite do cartão acima da renda do casal), R2 (parcelas correndo no mês acima da referência), R3 (cartão do casal), indicadores fora da referência e limites de categoria. Cada alerta pode ser dispensado no mês. **Nada é bloqueado.**
  - **Indicadores** da pessoa física (fixos 50%, lazer 30%, investir 20%, parcelas 10%, reserva ×6, patrimônio ×93) e da empresa (lucro 10%, pró-labore 50%, impostos 18%, operação 22%).
  - **Caixinhas** (desejo, reserva, investimento) com meta, prazo, aporte mensal necessário, **Guardar** e **Resgatar**. "Disponível fora das caixinhas" = saldo das contas − caixinhas, sem contar nada duas vezes.
  - **Limites por categoria**, com aviso aos 80% e ao passar.
- **Resumo** mostra os 3 principais alertas e, se houver caixinhas, quanto está guardado e quanto está disponível.
- **Categorias de Finanças** ganharam **tipo de gasto** (fixo, lazer, imposto), usado nos indicadores.
- **Mês do casal → Ajustar este mês** sugere o valor das caixinhas do casal pelas metas e prazos (botão "Usar"; você pode escolher outro).

## Configuração (2 minutos)

**Antes** de juntar o código ao `main`:

1. Abra https://supabase.com/dashboard/project/oyglhouncpiuuilprvhn/sql/new
2. Cole todo o conteúdo de `central-da-vida/supabase/fase3a.sql` (tradução do navegador desligada) e clique em **Run** (→ **Run and enable RLS**, se perguntar).
3. Resultado esperado: "Success. No rows returned".
4. Faça o merge do pull request; feche e abra o app depois de 1 a 2 minutos.

## Roteiro de teste

| # | Faça | Esperado |
|---|---|---|
| 1 | Mais → Categorias → Finanças: marque Aluguel/Mercado como **Fixo** e Restaurante como **Lazer** | Tipo salvo |
| 2 | Finanças → Júlia → **Metas** | Indicadores com renda R$ 6.000: fixos até R$ 3.000, lazer até R$ 1.800, investir R$ 1.200… |
| 3 | Ajustes → **Regras da casa** → mude Lazer para 25% e salve | Indicador muda para R$ 1.500 |
| 4 | Desligue "Lazer" e salve | Indicador e alerta de lazer somem |
| 5 | + Caixinha "Reserva" do tipo Reserva | Sugestão "6× sua renda = R$ 36.000" com botão Usar (opcional) |
| 6 | Guardar R$ 1.000 numa caixinha | "Disponível fora delas" cai R$ 1.000; o saldo da conta não muda |
| 7 | Caixinha com prazo | Mostra quanto guardar por mês |
| 8 | + Limite: Mercado R$ 800 no Casal; lance R$ 700 | Alerta "88% do limite" |
| 9 | Compra parcelada do casal com parcela acima de 10% da renda do casal | Alerta R2 com valores |
| 10 | Dispense um alerta | Some neste aparelho até o mês seguinte |
| 11 | Mês do casal → Ajustar este mês | Sugestão pelas caixinhas do casal |
| 12 | Michelangelo: aba Júlia → Metas | Vê tudo, mas não guarda/resgata nem edita |

Testes já feitos aqui: banco em Postgres 16 com os dois usuários (regra do casal única e editável pelos dois; regras pessoais só do dono; empresa invisível para o Michelangelo; caixinha pessoal só movimentada pelo dono; limite do Casal só com categoria do Casal; limite repetido recusado) e 16 testes automáticos (`npm test`), incluindo referências mudadas e desligadas e os 10/50/18/22 da empresa.

## Limitações conhecidas

- Dispensar alerta vale só no aparelho em que foi dispensado.
- "Investido no mês" soma aportes em caixinhas de reserva e investimento; transferências para contas de investimento não entram automaticamente.
- "Patrimônio" soma contas do tipo investimento e poupança.
- Pró-labore da empresa é identificado pelas transferências Empresa → conta pessoal.
- Gráficos, projeção dos próximos meses e simulador de compras chegam na **3B**.
