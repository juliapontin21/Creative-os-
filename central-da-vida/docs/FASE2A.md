# Central da Vida · Fase 2A · Base do dinheiro

## O que mudou (changelog)

- **Finanças de verdade**: abas Empresa (só Júlia), Júlia, Michelangelo e Casal. Na aba do outro, tudo aparece em modo **só ver**.
- **Resumo do mês**: saldo das contas hoje, previsão de fechamento, receitas e despesas (pagas e a pagar), contas vencidas, faturas em aberto e próximos vencimentos.
- **Lançamentos**: despesa, receita e transferência; filtros por busca, categoria, status (previsto, vencido, pago, cancelado), período, tipo e conta/cartão; visualizações salvas; marcar como pago com um toque.
- **Contas** com saldo inicial; **cartões** com fechamento, vencimento, limite e conta que paga a fatura; **faturas** calculadas automaticamente e botão **Pagar**.
- **Compras parceladas**: uma parcela por fatura; os centavos que sobram vão na primeira.
- **Cartão do casal** (regra R3): vem marcado nas despesas do Casal; o app avisa quando a regra não é seguida (só avisa, não bloqueia).
- **Transferências e pró-labore**: Empresa → Júlia sai de uma conta e entra na outra, sem virar receita nem despesa.
- **Favorecidos e Pix**: nome, tipo e chave Pix, com botão **Copiar Pix**.
- Botão **+** ganhou **Despesa** e **Receita**.

## Configuração (2 minutos)

**Antes** de juntar o código ao `main`, rode o banco da 2A:

1. Abra https://supabase.com/dashboard/project/oyglhouncpiuuilprvhn/sql/new
2. Cole todo o conteúdo de `central-da-vida/supabase/fase2a.sql` (com a tradução do navegador desligada) e clique em **Run** → **Run and enable RLS**, se perguntar.
3. Resultado esperado: "Success. No rows returned".
4. Depois disso, faça o merge do pull request. A Vercel publica sozinha em 1 a 2 minutos.

Se o merge acontecer antes do passo 2, o app mostra um erro ao abrir. Basta rodar o arquivo e recarregar.

## Roteiro de teste

| # | Faça | Esperado |
|---|---|---|
| 1 | Finanças → aba **Júlia** → Contas → **+ Conta** com saldo inicial | Saldo aparece na conta e no Resumo |
| 2 | Aba **Casal** → **+ Cartão**, marcando "cartão do casal", pago pela sua conta | Selo "Cartão do casal" |
| 3 | Tente marcar um segundo cartão como do casal | Mensagem "Já existe um cartão do casal" |
| 4 | **+ → Despesa** no Casal, R$ 300 em 3x no cartão do casal | 3 lançamentos (1/3, 2/3, 3/3), um em cada fatura |
| 5 | Contas → abra o cartão → **Pagar** a fatura | Status "paga"; o saldo da conta cai uma vez só |
| 6 | Despesa no Casal paga no Pix | Aviso da regra da casa (cartão do casal) |
| 7 | **+ → Transferência** Itaú PJ → sua conta, R$ 6.000, "Já transferi" | Empresa perde, Júlia ganha; nenhuma receita/despesa nova nos totais |
| 8 | Despesa prevista com vencimento ontem | Aparece como **Vencido** e no alerta do Resumo |
| 9 | Pix → novo favorecido com chave → **Copiar Pix** | "Chave Pix copiada" |
| 10 | No celular do Michelangelo: aba Júlia | Vê tudo, mas aparece "só ver" e nada pode ser editado |
| 11 | No celular do Michelangelo: lista de abas | Não existe aba Empresa |
| 12 | Michelangelo edita uma despesa do Casal | A mudança aparece no seu celular |

Testes já feitos aqui: banco em Postgres 16 simulando os dois usuários (visibilidade, edição bloqueada, empresa invisível, cálculo de fatura incluindo fevereiro e dia 31, cartão do casal único, conta da empresa recusada em lançamento pessoal) e 7 testes automáticos dos cálculos (`npm test`): saldo, resumo do mês, previsão, parcelas, faturas e leitura de valores.

## Limitações conhecidas

- O mês segue o **caixa**: despesa prevista conta no vencimento; paga, na data de pagamento. Compra no cartão conta no vencimento da fatura.
- Categorias pessoais aparecem só para quem criou; para o outro ver a categoria, use categorias do Casal (Mais → Categorias → Finanças → Criar sugestões).
- Editar uma parcela muda só aquela parcela. Para mudar todas, exclua e lance de novo.
- Mudar o dia de fechamento de um cartão não move compras já lançadas.
- Mês do casal, mesada, recorrências, assinaturas, calendário financeiro e visão anual da empresa chegam na **2B**.
