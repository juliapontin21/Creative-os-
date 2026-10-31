# Central da Vida · Fase 5 · Alimentação e mercado

## Decisões da Júlia (31/10/2026)

- **Cardápio e diário**: cada um vê os do outro; só o dono edita.
- **Receitas**: uma coleção só do casal (os dois veem e editam).
- **Meta de calorias**: opcional, cada um cadastra quando quiser (só a pessoa vê a própria meta).

## O que mudou (changelog)

- **Mais → Alimentação** (abas Cardápio, Diário, Receitas, Mercado). Atalhos no **+**: Mercado e "O que comi".
- **Receitas**: nome, link (Instagram, TikTok, site), **foto** (reduzida antes de enviar), categorias (doce, salgado, fit… em Mais → Categorias → Alimentação), porções, tempo, calorias por porção (opcional), ingredientes escritos do jeito natural ("300 g de frango") e modo de preparo. Busca por nome ou ingrediente; filtro por categoria. Ver em outro número de porções ajusta as quantidades.
- **Ao cardápio**: a partir da receita, para hoje, amanhã, próxima semana ou qualquer dia/refeição.
- **Cardápio da semana** (por pessoa): café da manhã, almoço, café da tarde e jantar, com receita ou texto livre; soma de calorias do dia; **copiar semana anterior**; **ingredientes da semana → lista** (somando repetidos e perguntando o que falta).
- **O que falta → lista**: na receita, marcar o que falta em casa, ajustar a quantidade e mandar para o mercado.
- **Lista de mercado** (do casal, ao vivo): digite "2 kg tomate" e o app separa quantidade, unidade e item; seções do mercado (Mais → Categorias → Mercado → Criar sugestões); quem adicionou e de qual receita veio; **itens iguais se juntam somando a quantidade**; comprados ficam riscados no fim; **limpar comprados**.
- **Diário**: o que comeu por refeição (receita ou texto, porções, calorias se souber); **"Comi o planejado"** com um toque; **planejado × consumido**; meta de calorias opcional com barra.

## Configuração (2 minutos)

**Antes** do merge:

1. Abra https://supabase.com/dashboard/project/oyglhouncpiuuilprvhn/sql/new
2. Cole todo o conteúdo de `central-da-vida/supabase/fase5.sql` (tradução do navegador desligada) e clique em **Run** (→ **Run and enable RLS**, se perguntar). Esperado: "Success".
3. Faça o merge do pull request; depois de 1 a 2 minutos, feche e abra o app.

O arquivo também cria a pasta de **fotos das receitas** no armazenamento do Supabase (1 GB no plano gratuito; as fotos são reduzidas para ocupar pouco).

## Roteiro de teste

| # | Faça | Esperado |
|---|---|---|
| 1 | Mais → Categorias → Alimentação e Mercado → Criar sugestões | Categorias e seções |
| 2 | Receitas → + → nome, link, foto, ingredientes ("300 g frango", "2 tomate"), preparo | Receita salva com foto |
| 3 | Abra a receita → Porções 2 | Quantidades recalculadas |
| 4 | Falta → marque 2 itens → Mandar | Vão para o Mercado com a origem |
| 5 | Mercado → "2 kg tomate" com "Tomate · kg" já na lista | Junta e soma |
| 6 | Michelangelo marca um item como comprado | Some da lista no seu celular na hora |
| 7 | Receita → Ao cardápio → Próxima semana | Aparece no cardápio |
| 8 | Cardápio → Ingredientes → lista | Junta os ingredientes da semana e pergunta o que falta |
| 9 | Diário → Comi o planejado | Registra e soma as calorias |
| 10 | Definir meta de calorias | Barra planejado/consumido × meta |
| 11 | Michelangelo abre seu cardápio | Vê, mas não edita |

Testes já feitos aqui: banco em Postgres 16 com os dois usuários (receitas e lista editáveis pelos dois; cardápio e diário só para ver pelo outro; meta privada; item sem receita e sem texto recusado) e 36 testes automáticos (`npm test`), incluindo leitura de "2 kg tomate", junção de itens iguais, porções e calorias. No navegador: marcar Tomate e Abobrinha como faltantes juntou o Tomate com o que já estava na lista (3 + 3 = 6) e criou a Abobrinha; digitar "2 kg batata" criou o item com 2 kg.

## Limitações conhecidas

- Calorias só as informadas por vocês; estimativa por foto/texto e assistente culinário chegam na **Fase 7**.
- Quantidades com unidades diferentes (ex.: "1 kg" e "3 un" de tomate) ficam em linhas separadas.
- Fotos das receitas ficam num endereço público difícil de adivinhar (aleatório); não coloque fotos pessoais sensíveis ali.
