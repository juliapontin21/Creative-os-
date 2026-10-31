# Central da Vida · Fase 2B · Mês do casal, contas fixas, calendário e empresa

## O que mudou (changelog)

- **Mês do casal** (aba Casal): renda do casal → − contas do casal → − caixinhas e reserva → **sobra** → **mesada de cada um, proporcional à renda**, com quanto cada um já usou e quanto resta. Aviso quando as contas e caixinhas passam da renda.
- **Calibragem**: cada um informa a própria **renda de referência** em Ajustes → Minha renda (a da Júlia já vem com R$ 6.000). Quando entrar dinheiro extra, **Ajustar este mês** muda a renda só daquele mês, sem mexer na referência. O mesmo botão define quanto vai para caixinhas e reserva.
- **Contas fixas** (aba Fixas): aluguel, condomínio, academia… cadastre uma vez e o app lança sozinho os próximos 12 meses (semanais: 3 meses; anuais: 2 anos) como previsto. Editar refaz as próximas ocorrências não pagas; **Encerrar** para a partir de hoje; as já pagas nunca mudam.
- **Assinaturas**: contas fixas marcadas como assinatura, com link do serviço e **link para o item no gerenciador de senhas** (nunca a senha).
- **Calendário financeiro**: mês com bolinhas por dia (a pagar, vencido, a receber/recebido, pago); toque no dia para ver e marcar como pago.
- **Empresa → Ano**: 12 meses com receitas e despesas (realizado e previsto) e saldo projetado; **a receber por cliente**; **a pagar**.

## Configuração (2 minutos)

**Antes** de juntar o código ao `main`:

1. Abra https://supabase.com/dashboard/project/oyglhouncpiuuilprvhn/sql/new
2. Cole todo o conteúdo de `central-da-vida/supabase/fase2b.sql` (tradução do navegador desligada) e clique em **Run** (→ **Run and enable RLS**, se perguntar).
3. Resultado esperado: "Success. No rows returned".
4. Faça o merge do pull request. A Vercel publica em 1 a 2 minutos; feche e abra o app.

## Roteiro de teste

| # | Faça | Esperado |
|---|---|---|
| 1 | Ajustes → **Minha renda de referência** | Júlia já aparece com R$ 6.000 |
| 2 | Michelangelo: Ajustes → Minha renda → informa a dele | Aparece no Mês do casal dos dois |
| 3 | Finanças → Casal → **Mês do casal** | Renda do casal = soma das duas; mesadas proporcionais |
| 4 | **Ajustar este mês** → caixinhas R$ 2.000 | Sobra e mesadas diminuem |
| 5 | Ajustar este mês → renda da Júlia R$ 8.000 (só este mês) | Mês muda; o mês seguinte continua com R$ 6.000 |
| 6 | Uma despesa pessoal de R$ 50 no Pix | "Usado" da sua mesada sobe R$ 50 |
| 7 | Casal → **Fixas** → + Aluguel mensal | 12 meses aparecem em Lançamentos e no Calendário |
| 8 | Edite o valor do Aluguel | Próximos meses não pagos mudam; os pagos não |
| 9 | **Encerrar** o Aluguel | Some dos meses futuros |
| 10 | Fixas → Assinaturas → + Netflix com link | Selo "Assinatura" e botão para abrir o serviço |
| 11 | **Calendário** → toque num dia com bolinha | Lista do dia; marcar como pago funciona |
| 12 | Empresa → **Ano** | 12 meses, saldo projetado, a receber por cliente |
| 13 | Michelangelo: aba Júlia → Fixas | Vê, mas não edita |

Testes já feitos aqui: banco em Postgres 16 com os dois usuários (renda só editável pelo dono, plano do mês único e editável pelos dois, conta fixa da empresa invisível para o Michelangelo, ocorrência duplicada ignorada) e 11 testes automáticos dos cálculos (`npm test`), incluindo o exemplo R$ 6.000 + R$ 4.000 → mesadas R$ 1.800 e R$ 1.200.

## Limitações conhecidas

- "Contas do casal" soma **todas** as despesas da aba Casal no mês (fixas e variáveis, pagas e a pagar), seguindo a regra da casa.
- "Usado" da mesada soma **todas** as despesas pessoais do mês.
- As contas fixas são completadas quando alguém abre o app; se ninguém abrir por mais de 11 meses, os meses seguintes aparecem na próxima abertura.
- Caixinhas com metas, gráficos, alertas das regras R1/R2 e indicadores (×93, ×0,2…) chegam na **Fase 3**.
