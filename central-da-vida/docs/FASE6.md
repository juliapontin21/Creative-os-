# Central da Vida · Fase 6 · Treinos e biblioteca

## Decisões da Júlia (31/10/2026)

- **Fichas e histórico de treino**: os dois veem; só o dono edita.
- **Biblioteca**: cada um tem a sua (o outro pode ver, sem editar); as sugestões de "o que ouvir hoje" vêm só da sua.

## O que mudou (changelog)

- **Mais → Treinos** (abas Hoje, Fichas, Histórico, Biblioteca) e **+ → Treino de hoje**.
- **Fichas**: nome, dias da semana, cor e exercícios com séries, repetições ou tempo, carga, descanso, observações, **link do vídeo de demonstração** e foto opcional; reordenar exercícios.
- **Hoje**: mostra a ficha do dia (ou escolha outra), tempo estimado, **última carga** usada em cada exercício; **Começar treino** → marcar cada exercício, ajustar a carga → **Concluir treino**. Se fechar o app no meio, o treino em andamento continua de onde parou (neste aparelho).
- **Histórico**: treinos nos últimos 30 dias, lista de treinos feitos e **evolução da carga** por exercício.
- **Biblioteca**: podcasts, músicas, playlists, audiolivros, vídeos, documentários, séries; link para abrir no app de origem; categorias (Mais → Categorias → Biblioteca); status (quero ver/ouvir → em andamento → concluído, com um toque); busca e filtros por tipo, status e categoria.
- **🎧 O que ouvir hoje**: no treino, até 3 sugestões de áudio da sua biblioteca: primeiro o que está em andamento, depois o que tem duração mais parecida com o treino.

## Configuração (2 minutos)

**Antes** do merge:

1. Abra https://supabase.com/dashboard/project/oyglhouncpiuuilprvhn/sql/new
2. Cole todo o conteúdo de `central-da-vida/supabase/fase6.sql` (tradução do navegador desligada) e clique em **Run** (→ **Run and enable RLS**, se perguntar). Esperado: "Success".
3. Faça o merge do pull request; depois de 1 a 2 minutos, feche e abra o app.

## Roteiro de teste

| # | Faça | Esperado |
|---|---|---|
| 1 | Treinos → Fichas → + → "Treino A", dias S e Q, 3 exercícios com link de vídeo | Ficha salva |
| 2 | Num dia marcado, Treinos → Hoje | Aparece o Treino A com tempo estimado |
| 3 | Toque na seta do exercício | Abre o vídeo de demonstração |
| 4 | Começar treino → marque exercícios, mude a carga → Concluir | Vai para o Histórico |
| 5 | Histórico → Evolução da carga → escolha o exercício | Barras com as cargas por data |
| 6 | Biblioteca → + podcast com link e duração | Aparece em "O que ouvir hoje" |
| 7 | Toque no status do item | Quero → Em andamento → Concluído |
| 8 | Michelangelo abre suas fichas e histórico | Vê, mas não edita |
| 9 | Michelangelo em Hoje | Sugestões só da biblioteca dele |

Testes já feitos aqui: todas as fases do banco rodadas em ordem num banco novo, sem erro; Fase 6 em Postgres 16 com os dois usuários (o outro vê fichas, exercícios, histórico e biblioteca, não edita e não consegue pôr exercício na ficha alheia); 39 testes automáticos (`npm test`), incluindo ficha do dia, tempo estimado, histórico de carga e "o que ouvir hoje". No navegador: começar, marcar 2 de 3 exercícios, mudar a carga do agachamento para 34 kg e concluir salvou exatamente isso.

## Limitações conhecidas

- Vídeos de demonstração por link (não ficam guardados no app).
- Sem integração com Spotify/YouTube/Apple: o app abre o link no aplicativo de origem.
- O treino em andamento fica guardado no aparelho em que foi começado.
