# Central da Vida · Fase 5 · Alimentação e mercado (proposta)

Aprovada em 31/10/2026: cardápio e diário visíveis para os dois (só o dono edita); receitas do casal; meta de calorias opcional.

Escopo da especificação: receitas, cardápio, ingredientes, lista de mercado compartilhada e diário alimentar **manual**. Estimativa de calorias por foto/texto com IA e assistente culinário ficam na **Fase 7**.

## O que entra

| Parte | Como funciona |
|---|---|
| **Receitas** (biblioteca) | Nome, link (Instagram, TikTok, site), foto opcional, categorias editáveis (doce, salgado, fit…), porções, tempo, ingredientes com quantidade e unidade, modo de preparo, calorias por porção (opcional, informadas por vocês) |
| **Cardápio da semana** | Por pessoa, por dia: café da manhã, almoço, café da tarde e jantar. Escolher uma receita ou escrever livre. "Adicionar ao dia" e "usar na próxima semana" a partir da receita; copiar semana |
| **Lista de mercado** (compartilhada, os dois editam ao vivo) | Itens com quantidade, unidade, seção do mercado (hortifrúti, açougue…), quem adicionou e origem ("da receita X", "manual"); marcar como comprado; itens repetidos se juntam somando a quantidade; limpar comprados |
| **Ingrediente faltante → lista** | Ao abrir uma receita ou o cardápio da semana, marcar o que falta em casa e mandar para a lista com um toque (com ajuste de quantidade) |
| **Diário alimentar** | O que comeu em cada refeição (texto livre ou receita + porções), calorias se souber; resumo do dia: **planejado × consumido** e meta calórica individual |

## Regras

- Calorias são **sempre informadas por vocês** nesta fase (receita ou item do diário). O app soma e compara com a meta, mas não inventa valores. Estimativa automática vem com a IA (Fase 7) e sempre mostrará a incerteza.
- Lista de mercado: um item só (ex.: "Tomate") com a soma das quantidades quando a unidade é a mesma; unidades diferentes ficam em linhas separadas.
- Sem compras automáticas nem integração com mercados.

## Perguntas antes de programar

1. **Cardápio e diário alimentar**: são **privados** de cada um (como hábitos) ou o outro pode **ver** (como agenda)?
2. **Receitas**: a biblioteca é **uma só do casal** (os dois veem e editam todas) ou cada um pode ter também **receitas só suas**?
3. **Meta de calorias**: quer já cadastrar uma meta diária por pessoa nesta fase (cada um informa a sua), ou deixar para depois?
