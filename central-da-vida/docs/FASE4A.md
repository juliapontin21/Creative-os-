# Central da Vida · Fase 4A · Agenda, hábitos e água

## Decisões da Júlia (31/10/2026)

- **Compromissos**: cada um vê **todos** os compromissos do outro; só quem criou edita. Os do Casal, os dois editam.
- **Hábitos e água**: individuais e **privados** (o outro não vê).
- Agenda com a **dinâmica** do TickTick (linha do tempo, arrastar, redimensionar, cores, marcar como feito), com visual próprio do app, sem copiar marca ou interface (regra da especificação).

## O que mudou (changelog)

- **Agenda** (aba Agenda):
  - Visões **Dia, 3 dias, Semana, Mês e Lista**; botão **Hoje**; **tela cheia** (ícone de quadradinhos; o × sai).
  - **Cor pela categoria** do compromisso (Mais → Categorias → Agenda). O parceiro vê a mesma cor; mudar a cor da categoria recolore todos os compromissos dela.
  - **Início e término** com horário; dia inteiro; vários dias.
  - **Segurar e arrastar** (cerca de meio segundo; o celular vibra quando pode): muda o horário e, em 3 dias/Semana, o dia. No **Mês**, arraste para outro dia.
  - **Puxar a borda de baixo** do compromisso para aumentar ou diminuir a duração (de 15 em 15 minutos).
  - **Marcar como feito** pela caixinha: o compromisso fica **apagado e riscado**.
  - Toque num horário vazio cria um compromisso naquele horário.
  - **Repetir** (todo dia, semana, mês, ano), com "só este" ou "este e os próximos" ao editar ou excluir.
  - **Afeta o parceiro**: destaca o compromisso na agenda dele e aparece no Hoje dele.
  - **Filtros**: meus, casal, do parceiro (todos / só os que me afetam / nenhum), **por categoria** (ex.: só Trabalho), hábitos, recebimentos, vencimentos e faturas, lembretes. Atalhos no topo: **Tudo**, **Só meus**, **Só do parceiro**, **Meus + os que me afetam**, **Pessoal**, **Trabalho** e uma pílula por categoria. O **Tipo (Pessoal/Trabalho)** é um campo do compromisso, visível para os dois, então dá para filtrar os de trabalho de cada um. Com tudo ligado, compromissos no mesmo horário aparecem lado a lado.
  - **Sem Google Agenda**: o Google é usado só para entrar no app (login); nada é lido ou gravado em agendas externas.
  - Recebimentos, vencimentos e faturas de Finanças aparecem como itens de dia inteiro.
  - Lembretes (minutos antes) já ficam guardados para as notificações da 4B.
- **Lembrete para o parceiro** (+ → Lembrete p/ parceiro): aparece no Hoje e na Agenda dele; ele marca como feito.
- **Hábitos e água** (Mais → Hábitos e água):
  - Hábito todo dia, em dias da semana ou X vezes por semana; meta por dia (ex.: 2 vezes, 30 min); marcar com um toque ou +/−; sequência de dias.
  - **Grade de quadradinhos** por semana, mês e ano, com % cumprido.
  - **Garrafa de água** que enche, com +200/+300/+500 ml, outro valor, desfazer e meta diária.
  - Opção de mostrar o hábito na sua agenda.
- **Hoje** mostra: lembretes do parceiro, agenda do dia (com feito), garrafa de água e hábitos do dia.

## Configuração (2 minutos)

**Antes** do merge (inclui o ajuste do tipo Pessoal/Trabalho; se já rodou o fase4a.sql antes, rode só o `fase4a2.sql`):

1. Abra https://supabase.com/dashboard/project/oyglhouncpiuuilprvhn/sql/new
2. Cole todo o conteúdo de `central-da-vida/supabase/fase4a.sql` (tradução do navegador desligada) e clique em **Run** (→ **Run and enable RLS**, se perguntar).
3. Resultado esperado: "Success. No rows returned".
4. Faça o merge do pull request; depois de 1 a 2 minutos, feche e abra o app.

## Roteiro de teste

| # | Faça | Esperado |
|---|---|---|
| 1 | Mais → Categorias → Agenda: crie "Trabalho" (laranja) e "Casal" (rosa, do Casal) | Categorias coloridas |
| 2 | Agenda → toque às 10h → "Gravação" na categoria Trabalho | Bloco laranja das 10h às 11h |
| 3 | Segure o bloco e arraste para baixo e para o dia seguinte | Muda horário e dia; duração igual |
| 4 | Puxe a borda de baixo | Duração muda de 15 em 15 min |
| 5 | Toque na caixinha do bloco | Fica apagado e riscado |
| 6 | Ícone de tela cheia | Agenda ocupa a tela; × volta |
| 7 | Mês → segure um compromisso e solte em outro dia | Muda de dia, mesmo horário |
| 8 | Compromisso semanal → edite "este e os próximos" | Próximos mudam; anteriores não |
| 9 | Marque "Afeta Michelangelo" | Aparece destacado no app dele e no Hoje dele |
| 10 | No celular dele: abra um compromisso seu | Vê, mas não edita nem arrasta |
| 11 | + → Lembrete p/ parceiro | Aparece no Hoje dele; ele marca feito |
| 12 | Hábitos: crie "Ler 20 min" todo dia e marque | Sequência e quadradinho preenchido |
| 13 | Água: +300 algumas vezes | Garrafa enche; "faltam" diminui |
| 14 | No celular dele: Mais → Hábitos e água | Não vê nada seu |

Testes já feitos aqui: banco em Postgres 16 com os dois usuários (parceiro vê e não edita compromissos pessoais; casal editável pelos dois; cor herdada e propagada da categoria; hábitos, marcações e água invisíveis para o outro; lembrete: quem recebe só marca feito e não apaga) e 25 testes automáticos (`npm test`), incluindo colunas de compromissos sobrepostos, encaixe de 15 min, repetições e sequência de hábitos. No navegador, simulando o toque: segurar e arrastar moveu "Gravação UGC" de hoje 10h para amanhã 11h, e puxar a borda estendeu "Reunião cliente" em 30 min.

## Limitações conhecidas

- **Notificações** no celular chegam na **4B**.
- Repetições são criadas até: diária 6 meses, semanal 1 ano, mensal 2 anos, anual 5 anos.
- No Dia, para mudar de dia, use o editor ou as visões 3 dias/Semana/Mês.
- Compromissos de vários dias com horário aparecem na faixa de dia inteiro e não são arrastáveis.
- Widget de água na tela do iPhone não é possível para app instalado pelo navegador.
- Sincronização com Google Agenda/Apple Calendário: não incluída.
